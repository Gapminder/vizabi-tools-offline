exports.metadataTemplate = {
  "color": {
    "shades": {
      "_default": {"_default": 0}
    },
    "palettes": {
      "_continuous": {"0": "#F77481", "1": "#E1CE00", "2": "#B4DE79"},
      "_discrete": {
        "0": "#bcfa83",
        "1": "#4cd843",
        "2": "#ff8684",
        "3": "#e83739",
        "4": "#ffb04b",
        "5": "#ff7f00",
        "6": "#f599f5",
        "7": "#c027d4",
        "8": "#f4f459",
        "9": "#d66425",
        "10": "#7fb5ed",
        "11": "#0ab8d8"
      },
      "_default": {"_default": "#fa5ed6"}
    },
    "selectable": {}
  },
  "indicatorsDB": {
    "geo": {
      "allowCharts": ["*"],
      "use": "property",
      "unit": "",
      "scales": ["ordinal"],
      "sourceLink": "https://docs.google.com/spreadsheets/d/1OxmGUNWeADbPJkQxVPupSOK5MbAECdqThnvyPrwG5Os/pub"
    },
    "geo.name": {
      "allowCharts": ["*"],
      "use": "property",
      "unit": "",
      "scales": ["ordinal"],
      "sourceLink": "https://docs.google.com/spreadsheets/d/1OxmGUNWeADbPJkQxVPupSOK5MbAECdqThnvyPrwG5Os/pub"
    },
    "size": {"allowCharts": ["none"], "use": "property", "unit": "", "scales": ["ordinal"], "sourceLink": ""}//,
  },
  "indicatorsTree": {
    "id": "_root",
    "children": [{"id": "time"}, {
      "children": [{"id": "geo"}, {"id": "geo.name"}, {"id": "size"}],
      "id": "_properties"
    },
      {"children": [], "id": "main"}, {"id": "_default"}]
  },
  "entities": []
};
