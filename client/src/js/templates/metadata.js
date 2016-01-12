exports.metadataTemplate = {
  "color": {
    "shades": {
      "geo.region": {
        "fill1": 0,
        "fill2": 1,
        "fill3": 2,
        "shade": 3,
        "print_fill": 4,
        "print_stroke": 5,
        "_default": 0
      }, "_default": {"_default": 0}
    },
    "palettes": {
      "geo.region": {
        "asia": ["#ff5872", "#ff5178", "#ff658a", "#da0025", "#fa4e73", "#b2043a"],
        "europe": ["#ffe700", "#fbdd00", "#fff400", "#fbaf09", "#ffe700", "#b17f4a"],
        "americas": ["#7feb00", "#5de200", "#81f201", "#00b900", "#b5ea32", "#008d36"],
        "africa": ["#00d5e9", "#00c8ec", "#00e1ec", "#0098df", "#77dff7", "#0586c6"],
        "_default": ["#ffb600", "#ffaa14", "#ffc500", "#fb6d19", "#ffb600", "#9b4838"]
      },
      "gdp_pc": {"0": "#62CCE3", "1": "#B4DE79", "2": "#E1CE00", "3": "#F77481"},
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
    "selectable": {"geo.region": false}
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
    "geo.region": {
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
      "children": [{"id": "geo"}, {"id": "geo.name"}, {"id": "geo.region"}, {"id": "size"}],
      "id": "_properties"
    },
    {"children": [], "id": "main"}, {"id": "_default"}]
  },
  "entities": []
};
