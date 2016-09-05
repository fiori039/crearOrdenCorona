/*global location */
sap.ui.define([
	"com/corona/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"com/corona/model/formatter",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function(BaseController, JSONModel, formatter, MessageBox, MessageToast) {
	"use strict";
	var _timeout;

	return BaseController.extend("com.corona.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0
			});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.setModel(oViewModel, "detailView");
			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
			this._oODataModel = this.getOwnerComponent().getModel();
			this._oResourceBundle = this.getResourceBundle();

		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onShareEmailPress: function() {
			var oViewModel = this.getModel("detailView");

			sap.m.URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},

		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress: function() {
			var oViewModel = this.getModel("detailView"),
				oShareDialog = sap.ui.getCore().createComponent({
					name: "sap.collaboration.components.fiori.sharing.dialog",
					settings: {
						object: {
							id: location.href,
							share: oViewModel.getProperty("/shareOnJamTitle")
						}
					}
				});

			oShareDialog.open();
		},

		/**
		 * Event handler (attached declaratively) for the view delete button. Deletes the selected item.
		 * @function
		 * @public
		 */
		onDelete: function() {
			var that = this;
			var oViewModel = this.getModel("detailView"),
				sPath = oViewModel.getProperty("/sObjectPath"),
				sObjectHeader = this._oODataModel.getProperty(sPath + "/Qmtxt"),
				sQuestion = this._oResourceBundle.getText("deleteText", sObjectHeader),
				sSuccessMessage = this._oResourceBundle.getText("deleteSuccess", sObjectHeader);

			var fnMyAfterDeleted = function() {
				MessageToast.show(sSuccessMessage);
				oViewModel.setProperty("/busy", false);
				var oNextItemToSelect = that.getOwnerComponent().oListSelector.findNextItem(sPath);
				that.getModel("appView").setProperty("/itemToSelect", oNextItemToSelect.getBindingContext().getPath()); //save last deleted
			};
			this._confirmDeletionByUser({
				question: sQuestion
			}, [sPath], fnMyAfterDeleted);
		},

		/**
		 * Event handler (attached declaratively) for the view edit button. Open a view to enable the user update the selected item.
		 * @function
		 * @public
		 */
		onEdit: function() {
			this.getModel("appView").setProperty("/addEnabled", false);
			var sObjectPath = this.getView().getElementBinding().getPath();
			this.getRouter().getTargets().display("create", {
				mode: "update",
				objectPath: sObjectPath
			});
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			var oParameter = oEvent.getParameter("arguments");
			for (var value in oParameter) {
				oParameter[value] = decodeURIComponent(oParameter[value]);
			}
			this.getModel().metadataLoaded().then(function() {
				var sObjectPath = this.getModel().createKey("AvisoSet", oParameter);
				this._bindView("/" + sObjectPath);
			}.bind(this));

			this.f_reiniciar_datosPantalla();
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function(sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		/**
		 * Event handler for binding change event
		 * @function
		 * @private
		 */

		_onBindingChange: function() {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding(),
				oViewModel = this.getModel("detailView"),
				oAppViewModel = this.getModel("appView");

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath(),
				oResourceBundle = this.getResourceBundle(),
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.Qmnum,
				sObjectName = oObject.Qmtxt;

			oViewModel.setProperty("/sObjectId", sObjectId);
			oViewModel.setProperty("/sObjectPath", sPath);
			oAppViewModel.setProperty("/itemToSelect", sPath);
			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			oViewModel.setProperty("/saveAsTileTitle", oResourceBundle.getText("shareSaveTileAppTitle", [sObjectName]));
			oViewModel.setProperty("/shareOnJamTitle", sObjectName);
			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
		},

		/**
		 * Event handler for metadata loaded event
		 * @function
		 * @private
		 */

		_onMetadataLoaded: function() {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView");

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		/**
		 * Opens a dialog letting the user either confirm or cancel the deletion of a list of entities
		 * @param {object} oConfirmation - Possesses up to two attributes: question (obligatory) is a string providing the statement presented to the user.
		 * title (optional) may be a string defining the title of the popup.
		 * @param {object} oConfirmation - Possesses up to two attributes: question (obligatory) is a string providing the statement presented to the user.
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnAfterDeleted (optional) - called after deletion is done.
		 * @param {callback} fnDeleteCanceled (optional) - called when the user decides not to perform the deletion
		 * @param {callback} fnDeleteConfirmed (optional) - called when the user decides to perform the deletion. A Promise will be passed
		 * @function
		 * @private
		 */
		/* eslint-disable */ // using more then 4 parameters for a function is justified here
		_confirmDeletionByUser: function(oConfirmation, aPaths, fnAfterDeleted, fnDeleteCanceled, fnDeleteConfirmed) {
			/* eslint-enable */
			// Callback function for when the user decides to perform the deletion
			var fnDelete = function() {
				// Calls the oData Delete service
				this._callDelete(aPaths, fnAfterDeleted);
			}.bind(this);

			// Opens the confirmation dialog
			MessageBox.show(oConfirmation.question, {
				icon: oConfirmation.icon || MessageBox.Icon.WARNING,
				title: oConfirmation.title || this._oResourceBundle.getText("delete"),
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function(oAction) {
					if (oAction === MessageBox.Action.OK) {
						fnDelete();
					} else if (fnDeleteCanceled) {
						fnDeleteCanceled();
					}
				}
			});
		},

		/**
		 * Performs the deletion of a list of entities.
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnAfterDeleted (optional) - called after deletion is done.
		 * @return a Promise that will be resolved as soon as the deletion process ended successfully.
		 * @function
		 * @private
		 */
		_callDelete: function(aPaths, fnAfterDeleted) {
			var oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", true);
			var fnFailed = function() {
				this._oODataModel.setUseBatch(true);
			}.bind(this);
			var fnSuccess = function() {
				if (fnAfterDeleted) {
					fnAfterDeleted();
					this._oODataModel.setUseBatch(true);
				}
				oViewModel.setProperty("/busy", false);
			}.bind(this);
			return this._deleteOneEntity(aPaths[0], fnSuccess, fnFailed);
		},

		/**
		 * Deletes the entity from the odata model
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnSuccess - Event handler for success operation.
		 * @param {callback} fnFailed - Event handler for failure operation.
		 * @function
		 * @private
		 */
		_deleteOneEntity: function(sPath, fnSuccess, fnFailed) {
			var oPromise = new Promise(function(fnResolve, fnReject) {
				this._oODataModel.setUseBatch(false);
				this._oODataModel.remove(sPath, {
					success: fnResolve,
					error: fnReject,
					async: true
				});
			}.bind(this));
			oPromise.then(fnSuccess, fnFailed);
			return oPromise;
		},

		//Funciones nuevas a partir de acá
		onAfterRendering: function() {
			//Add Johnny López
			this.getView().byId("dateFecha").setDateValue(new Date());

		},

		f_ayuda_busqueda_material: function(event) {
			if (!this._dialogo_material) {
				this._dialogo_material = sap.ui.xmlfragment(
					"com.corona.view.fragment.DlgMaterial",
					this
				);
				this.getView().addDependent(this._dialogo_material);
			}

			// open value help dialog
			this._dialogo_material.open();
		},

		/**
		 * Implementar la búsqueda de Materiales
		 * @function
		 * @param {Object} evt Evento ejecutado cuando el cliente oprime icono Buscar
		 * @public
		 */
		f_Search_material: function(evt) {
			var sValue = evt.getParameter("value"),
				Werks = this.getView().getBindingContext().getProperty("Werks");

			//Add Jhony Lopez
			var filters = [];
			var sFilter;
			sFilter = new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, Werks);
			filters.push(sFilter);

			sFilter = new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.EQ, '*' + sValue + '*');
			filters.push(sFilter);

			sFilter = new sap.ui.model.Filter("Maktx", sap.ui.model.FilterOperator.EQ, '*' + sValue + '*');
			filters.push(sFilter);

			var binding = evt.getSource().getBinding("items");
			binding.filter(filters);
		},

		f_caracteristica_material: function(evt, p_material) {
			var lista = this.byId("tableCaracteristicas"),
				filters = [],
				query = p_material,
				binding = lista.getBinding("items");

			binding.filter(filters);
			filters = new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.EQ, query);

			binding.filter(filters);

			this.f_visualizar_datos_material(true);
		},

		f_confirm_material: function(evt) {
			var oSelectedItem = evt.getParameter("selectedItem");

			//Reinicia los items del valor del modelo en blanco, cada vez que se cambie de material seleccionado
			for (var i in this.getView().byId("tableCaracteristicas").getItems()) {
				if (this.getView().byId("tableCaracteristicas").getItems().hasOwnProperty(i)) {
					this.getView().byId("tableCaracteristicas").getItems()[i].getCells()[1].setValue(null);
				}
			}

			if (oSelectedItem) {
				var material = this.getView().byId("inputMaterial");
				material.setValue(oSelectedItem.getTitle() + "-" + oSelectedItem.getDescription());
			}
			evt.getSource().getBinding("items").filter([]);

			this.f_caracteristica_material(evt, oSelectedItem.getTitle());
		},

		f_valor_caracteristica_material: function(evt, p_material) {
			var lista = sap.ui.getCore().byId("list_ValorCaractMaterial"),
				filters1 = [],
				filters2 = [],
				filtros = [],
				query = p_material,
				carac = evt.oSource.oParent.getBindingContext().getProperty("Name");

			filters1 = new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.EQ, query);
			filters2 = new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.EQ, carac);

			filtros = new sap.ui.model.Filter([filters1, filters2], true);

			var binding = lista.getBinding("items");
			binding.filter(filtros);

			//Guardar path del item seleccionado para asignarle el valor de la ayuda de búsqueda
			this.v_pathItemCaracteristica = evt.oSource.oParent.getBindingContext();

		},

		f_ayuda_busqueda_caracteristica: function(event) {
			var material = event.oSource.oParent.getBindingContext().getProperty("Matnr");
			if (!this._dialogo_caracteristica) {
				this._dialogo_caracteristica = sap.ui.xmlfragment(
					"com.corona.view.fragment.DlgValorCaractMaterial",
					this
				);
				this.getView().addDependent(this._dialogo_caracteristica);
			}

			// open value help dialog
			this._dialogo_caracteristica.open();
			this.f_valor_caracteristica_material(event, material);
		},

		f_confirm_valor_caracteristica: function(evt) {
			var oSelectedItem = evt.getParameter("selectedItem"),
				//Obtener el path del item seleccionado y la propiedad value que se va modificar
				pathItemSelec = this.v_pathItemCaracteristica.getPath() + "/Value";

			if (oSelectedItem) {
				this.v_pathItemCaracteristica.getModel().setProperty(pathItemSelec, oSelectedItem.getTitle());
			}
			evt.getSource().getBinding("items").filter([]);
		},

		f_visualizar_datos_material: function(p_visualizar) {
			this.byId("tableCaracteristicas").setVisible(p_visualizar);
			this.byId("labelInicio").setVisible(p_visualizar);
			this.byId("dateFecha").setVisible(p_visualizar);
			this.byId("inputFecha").setVisible(p_visualizar);
		},

		f_reiniciar_datosPantalla: function() {
			this.getView().byId("inputMaterial").setValue(null);
			this.f_visualizar_datos_material(false);
		},

		f_crearOrden: function(p_event) {
			this.onOpenDialog(p_event);
			this.f_crearOrdenServicio(p_event);
		},

		f_crearOrdenServicio: function(p_event) {
			var aviso = this.getView().getBindingContext().getProperty('Qmnum'),
				centro = this.getView().getBindingContext().getProperty('Werks'),
				pttara = this.getView().getBindingContext().getProperty('Puest'),
				mat = this.getView().byId("inputMaterial").getValue().split('-', 1)[0],
				serviceUrl = this.getView().getBindingContext().oModel.sServiceUrl,
				modelo,
				caract,
				orden,
				mensaje,
				tp_mensaje;

			caract = this.f_mapear_caracteristicas();

			orden = {
				Qmnum: aviso,
				Arbpl: pttara,
				Werks: centro,
				Matnr: mat,
				Carac: caract
			};

			// modelo = this.f_crear_modelo(serviceUrl, true);

			// mensaje = this.f_crear_entity(modelo, "/OrdenSet", orden);

			// tp_mensaje = mensaje.split('-', 2);

			// simulate end of operation
			_timeout = jQuery.sap.delayedCall(500, this, function() {
				modelo = this.f_crear_modelo(serviceUrl, true);
				mensaje = this.f_crear_entity(modelo, "/OrdenSet", orden);
				tp_mensaje = mensaje.split('-', 2);
				this._dialog.close();
				this.handleErrorMessageBoxPress(p_event, tp_mensaje[1], tp_mensaje[0]);
			});
			
		},

		f_mapear_caracteristicas: function() {
			var caract,
				value;

			for (var i in this.getView().byId("tableCaracteristicas").getItems()) {
				if (this.getView().byId("tableCaracteristicas").getItems().hasOwnProperty(i)) {

					if (this.getView().byId("tableCaracteristicas").getItems()[i].getCells()[1].getValue() === "") {
						continue;
					}

					caract = this.getView().byId("tableCaracteristicas").getItems()[i].getCells()[0].getValue() + "-" + this.getView().byId(
						"tableCaracteristicas").getItems()[i].getCells()[1].getValue() + ";";

					if (value === undefined) {
						value = caract;
					} else {
						value = value + caract;
					}
				}
			}
			if (value) {
				return value.slice(0, -1);
			} else {
				return undefined;
			}

		},

		f_crear_modelo: function(p_serviceUrl, p_json) {
			var oModel = new sap.ui.model.odata.ODataModel(p_serviceUrl, p_json);
			return oModel;
		},

		f_crear_entity: function(p_modelo, p_entidad, p_datoEndidad) {
			var mensaje;

			var fnSucess = function(data, response) {
				mensaje = data.Texto;
				mensaje = "success" + "-" + mensaje;
			};
			var fnError = function(e) {
				mensaje = JSON.parse(e.response.body);
				mensaje = mensaje.error.message.value;
				mensaje = "error" + "-" + mensaje;
			};

			//Crear datos nuevos del formulario profesional tabla sap ZSDT_060
			p_modelo.create(p_entidad, p_datoEndidad, null, fnSucess, fnError, false);

			return mensaje;
		},

		handleErrorMessageBoxPress: function(p_evetn, p_message, p_type) {
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			switch (p_type) {
				case "error":
					MessageBox.error(
						p_message, {
							styleClass: bCompact ? "sapUiSizeCompact" : ""
						}
					);
					break;
				case "success":
					MessageBox.success(
						p_message, {
							styleClass: bCompact ? "sapUiSizeCompact" : ""
						}
					);
					break;
			}

		},

		onOpenDialog: function(oEvent) {
			// instantiate dialog
			if (!this._dialog) {
				this._dialog = sap.ui.xmlfragment("com.corona.view.fragment.BusyDialog", this);
				this.getView().addDependent(this._dialog);
			}

			// open dialog
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._dialog);
			this._dialog.open();

			// // simulate end of operation
			// _timeout = jQuery.sap.delayedCall(3000, this, function() {
			// 	this._dialog.close();
			// });
		},

		onDialogClosed: function(oEvent) {
			jQuery.sap.clearDelayedCall(_timeout);

			if (oEvent.getParameter("cancelPressed")) {
				MessageToast.show("The operation has been cancelled");
			} else {
				MessageToast.show("The operation has been completed");
			}
		}
	});
});