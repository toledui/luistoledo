// Reproducible GTM import. The real GA4 ID comes from the application's public configuration.
const fs = require("node:fs");
const path = require("node:path");
const template = (key, value) => ({ type: "TEMPLATE", key, value });
const dlv = (name) => ({
  name: `DLV - ${name}`,
  type: "v",
  parameter: [
    template("name", name),
    { type: "INTEGER", key: "dataLayerVersion", value: "2" },
  ],
});
const setting = (name, value) => ({
  type: "MAP",
  map: [template("parameter", name), template("parameterValue", value)],
});
const googleSettings = [
  setting("send_page_view", "{{JS - False}}"),
  setting("page_location", "{{JS - Safe location}}"),
  setting("page_referrer", "{{JS - Safe referrer}}"),
];
const value = {
  exportFormatVersion: 2,
  containerVersion: {
    container: {
      name: "Luis Toledo Academy - Analytics",
      usageContext: ["WEB"],
    },
    tag: [
      {
        tagId: "1",
        name: "Google tag - no automatic page views",
        type: "googtag",
        parameter: [
          template("tagId", "{{DLV - ga_measurement_id}}"),
          { type: "LIST", key: "configSettingsTable", list: googleSettings },
        ],
        firingTriggerId: ["2147479553"],
        tagFiringOption: "ONCE_PER_EVENT",
      },
      {
        tagId: "2",
        name: "GA4 - application browser events",
        type: "gaawe",
        parameter: [
          template("measurementIdOverride", "{{DLV - ga_measurement_id}}"),
          template("eventName", "{{DLV - event_name}}"),
          { type: "BOOLEAN", key: "sendEcommerceData", value: "true" },
          template("getEcommerceDataFrom", "dataLayer"),
          {
            type: "LIST",
            key: "eventSettingsTable",
            list: [
              "event_id",
              "page_location",
              "page_referrer",
              "currency",
              "value",
            ].map((name) => setting(name, `{{DLV - ${name}}}`)),
          },
        ],
        firingTriggerId: ["1"],
        tagFiringOption: "ONCE_PER_EVENT",
      },
    ],
    trigger: [
      {
        triggerId: "1",
        name: "Application - lta_event",
        type: "CUSTOM_EVENT",
        customEventFilter: [
          {
            type: "EQUALS",
            parameter: [
              template("arg0", "{{_event}}"),
              template("arg1", "lta_event"),
            ],
          },
        ],
      },
    ],
    variable: [
      ...[
        "ga_measurement_id",
        "event_name",
        "event_id",
        "page_location",
        "page_referrer",
        "currency",
        "value",
      ].map(dlv),
      {
        name: "JS - False",
        type: "jsm",
        parameter: [template("javascript", "function(){ return false; }")],
      },
      {
        name: "JS - Safe location",
        type: "jsm",
        parameter: [
          template(
            "javascript",
            'function(){ return location.origin + location.pathname.replace(/(\\/certificados\\/verificar\\/)[^/]+/, "$1[code]"); }',
          ),
        ],
      },
      {
        name: "JS - Safe referrer",
        type: "jsm",
        parameter: [
          template(
            "javascript",
            'function(){ try { var u = new URL(document.referrer); return u.origin === location.origin ? "" : u.origin; } catch(e){ return ""; } }',
          ),
        ],
      },
    ],
  },
};
const destination = path.join(__dirname, "..", "docs", "gtm-container.json");
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(value, null, 2) + "\n");
console.log(
  "Generated docs/gtm-container.json. Import into a GTM workspace, verify in Preview, then publish.",
);
