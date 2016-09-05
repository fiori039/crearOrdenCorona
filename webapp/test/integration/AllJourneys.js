jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

// We cannot provide stable mock data out of the template.
// If you introduce mock data, by adding .json files in your webapp/localService/mockdata folder you have to provide the following minimum data:
// * At least 3 AvisoSet in the list

sap.ui.require([
	"sap/ui/test/Opa5",
	"com/corona/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"com/corona/test/integration/pages/App",
	"com/corona/test/integration/pages/Browser",
	"com/corona/test/integration/pages/Master",
	"com/corona/test/integration/pages/Detail",
	"com/corona/test/integration/pages/Create",
	"com/corona/test/integration/pages/NotFound"
], function(Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "com.corona.view."
	});

	sap.ui.require([
		"com/corona/test/integration/MasterJourney",
		"com/corona/test/integration/NavigationJourney",
		"com/corona/test/integration/NotFoundJourney",
		"com/corona/test/integration/BusyJourney",
		"com/corona/test/integration/FLPIntegrationJourney"
	], function() {
		QUnit.start();
	});
});