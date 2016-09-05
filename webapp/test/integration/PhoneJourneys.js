jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/test/Opa5",
	"com/corona/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"com/corona/test/integration/pages/App",
	"com/corona/test/integration/pages/Browser",
	"com/corona/test/integration/pages/Master",
	"com/corona/test/integration/pages/Detail",
	"com/corona/test/integration/pages/NotFound"
], function(Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "com.corona.view."
	});

	sap.ui.require([
		"com/corona/test/integration/NavigationJourneyPhone",
		"com/corona/test/integration/NotFoundJourneyPhone",
		"com/corona/test/integration/BusyJourneyPhone"
	], function() {
		QUnit.start();
	});
});