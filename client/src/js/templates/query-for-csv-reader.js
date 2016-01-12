exports.queryForCsvReader = {
  name: '',
  tool: 'BubbleChart',
  opts: {
    data: {
      path: null,
      geoPath: null,
      reader: 'safe-csv',
      splash: true
    },
    ui: {
      buttons: ['colors', 'find', 'trails', 'lock', 'size', 'moreoptions', 'fullscreen'],
      dialogs: {
        popup: ['colors', 'find', 'size', 'moreoptions'],
        sidebar: ['colors', 'find', 'size'],
        moreoptions: ['opacity', 'speed', 'axes', 'size', 'colors', 'presentation']
      }
    },
    state: {
      time: {
        start: null,
        end: null,
        value: null,
        step: 1,
        formatInput: "%Y",
        trails: true,
        lockNonSelected: 0,
        adaptMinMaxZoom: false
      },
      entities: {dim: "geo", show: {geo: ["*"], "geo.cat": ["country"]}},
      marker: {
        space: ["entities", "time"],
        type: "geometry",
        shape: "circle",
        label: {use: "property", which: "geo.name"},
        axis_y: {
          use: "indicator",
          which: "u5mr",
          scaleType: "linear",
          allow: {scales: ["linear", "log"]}
        },
        axis_x: {
          use: "indicator",
          which: "gdp_pc",
          scaleType: "log",
          allow: {scales: ["linear", "log"]}
        },
        color: {
          use: "property",
          which: "geo.region",
          scaleType: "ordinal",
          allow: {names: ["!geo.name"]},
          palette: {
            asi: "#FF5872",
            eur: "#FFE700",
            ame: "#7FEB00",
            afr: "#00D5E9",
            _default: "#ffb600"
          }
        },
        size: {
          use: "indicator",
          which: "pop",
          scaleType: "linear",
          allow: {scales: ["linear", "log"]},
          min: 0.04,
          max: 0.9
        }
      }
    },
    language: {id: "en", strings: {}}
  }
};
