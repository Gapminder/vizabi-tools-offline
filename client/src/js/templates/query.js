exports.queryTemplate = {
  BubbleChart: {
    data: {
      reader: 'ddfcsv',
      splash: false
    },
    ui: {
      buttons: ['colors', 'find', 'trails', 'lock', 'size', 'moreoptions', 'fullscreen'],
      dialogs: {
        'popup': ['colors', 'find', 'size', 'moreoptions'],
        'sidebar': ['colors', 'find', 'size'],
        'moreoptions': ['opacity', 'speed', 'axes', 'size', 'colors', 'presentation']
      }
    },
    state: {
      time: {
        start: "1800",
        end: "2015",
        value: "2015",
        step: 1,
        formatInput: "%Y",
        trails: true,
        lockNonSelected: 0,
        adaptMinMaxZoom: false
      },
      entities: {
        dim: "geo",
        show: {
          "geo.cat": ["country"]
        }
      },
      marker: {
        space: ["entities", "time"],
        type: "geometry",
        shape: "circle",
        label: {
          use: "property",
          which: "geo.name"
        },
        axis_y: {
          use: "indicator",
          which: "",//
          scaleType: "linear",
          allow: {
            scales: ["linear", "log"]
          }
        },
        axis_x: {
          use: "indicator",
          which: "",//
          scaleType: "log",
          allow: {
            scales: ["linear", "log"]
          }
        },
        color: {
          use: "property",
          which: "geo.region",
          scaleType: "ordinal",
          allow: {
            names: ["!geo.name"]
          },
          palette: {
            asia: "#FF5872",
            europe: "#FFE700",
            americas: "#7FEB00",
            africa: "#00D5E9",
            _default: "#ffb600"
          }
        },
        size: {
          use: "indicator",
          which: "",//
          scaleType: "linear",
          allow: {
            scales: ["linear", "log"]
          },
          min: .04,
          max: .90
        }
      }
    }
  },
  MountainChart: {
    state: {
      time: {
        start: "1800",
        end: "2015",
        value: "2015",
        step: 1,
        delay: 100,
        delayThresholdX2: 50,
        delayThresholdX4: 25,
        formatInput: "%Y",
        xLogStops: [1, 2, 5],
        yMaxMethod: "latest",
        probeX: 1.85,
        tailFatX: 1.85,
        tailCutX: .2,
        tailFade: .7,
        xScaleFactor: 1.039781626,
        //0.9971005335,
        xScaleShift: -1.127066411,
        //-1.056221322,
        xPoints: 50
      },
      entities: {
        dim: "geo",
        opacitySelectDim: .3,
        opacityRegular: .6,
        show: {
          "geo": ["*"],
          "geo.cat": ["country", "unstate"]
        }
      },
      marker: {
        space: ["entities", "time"],
        label: {
          use: "property",
          which: "geo.name"
        },
        axis_y: {
          use: "indicator",
          //which: "population",
          which: "",//
          scaleType: 'linear'
        },
        axis_x: {
          use: "indicator",
          //which: "gdp_p_cap_const_ppp2011_dollar",
          which: "",//
          scaleType: 'log'/*,
          min: .11, //0
          max: 500 //100*/
        },
        size: {
          use: "indicator",
          //which: "gini",
          which: "",//
          scaleType: 'linear'
        },
        color: {
          use: "property",
          which: "geo.region",
          scaleType: "ordinal",
          allow: {
            names: ["!geo.name"]
          }
        },
        stack: {
          use: "constant",
          which: "all" // set a property of data or values "all" or "none"
        },
        group: {
          use: "property",
          which: "geo.region", // set a property of data
          manualSorting: ["asia", "africa", "americas", "europe"],
          merge: false
        }
      }
    },
    language: 'en',
    data: {
      reader: "ddfcsv",
      splash: false
    },
    ui: {
      buttons: [],
      dialogs: {popup: [], sidebar: [], moreoptions: []},
      presentation: false
    }
  },
  BubbleMap: {
    state: {
      time: {
        start: "1800",
        end: "2015",
        value: "2015",
        step: 1,
        speed: 300,
        formatInput: "%Y"
      },
      entities: {
        dim: "geo",
        opacitySelectDim: .3,
        opacityRegular: 1,
        show: {
          "geo.cat": ["country", "unstate"]
        }
      },
      marker: {
        space: ["entities", "time"],
        label: {
          use: "property",
          which: "geo.name"
        },
        size: {
          use: "indicator",
          which: "",//
          scaleType: "linear",
          allow: {
            scales: ["linear", "log"]
          },
          min: .04,
          max: .90
        },
        lat: {
          use: "property",
          which: "geo.latitude"
        },
        lng: {
          use: "property",
          which: "geo.longitude"
        },
        color: {
          use: "property",
          which: "geo.region",
          scaleType: "ordinal",
          allow: {
            names: ["!geo.name"]
          }
        }
      }
    },
    data: {
      reader: "ddfcsv",
      splash: false
    },
    language: 'en',
    ui: {
      buttons: [],
      dialogs: {popup: [], sidebar: [], moreoptions: []},
      presentation: false
    }
  }
};
