export interface GhanaTown {
  name: string;
  lat: number;
  lng: number;
  district?: string;
}

export interface GhanaDepot {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  lat: number;
  lng: number;
  address: string;
  capacityDailyTons: number;
  contactPhone: string;
}

export interface GhanaLandfill {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  lat: number;
  lng: number;
  address: string;
  type: 'Engineered Sanitary Landfill' | 'Material Recovery & Recycling' | 'Compost & Bio-Digestion Plant';
}

export interface GhanaRegion {
  id: string;
  name: string;
  capital: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  towns: GhanaTown[];
  depot: GhanaDepot;
  landfill: GhanaLandfill;
}

export const GHANA_CENTER: [number, number] = [7.9465, -1.0232];
export const GHANA_DEFAULT_ZOOM = 7;

export const GHANA_REGIONS: GhanaRegion[] = [
  {
    id: 'greater_accra',
    name: 'Greater Accra Region',
    capital: 'Accra',
    center: [5.6037, -0.187],
    zoom: 11,
    depot: {
      id: 'depot-accra',
      name: 'Accra Central Depot & Transfer Station',
      regionId: 'greater_accra',
      regionName: 'Greater Accra',
      lat: 5.578,
      lng: -0.192,
      address: 'Ring Road Industrial Area, South Industrial Area, Accra',
      capacityDailyTons: 1200,
      contactPhone: '+233 30 222 9901',
    },
    landfill: {
      id: 'landfill-kpone',
      name: 'Kpone Engineered Integrated Landfill & Recycling Complex',
      regionId: 'greater_accra',
      regionName: 'Greater Accra',
      lat: 5.702,
      lng: 0.055,
      address: 'Kpone Industrial Park, Tema/Kpone District',
      type: 'Engineered Sanitary Landfill',
    },
    towns: [
      { name: 'Airport Residential', lat: 5.6052, lng: -0.1741 },
      { name: 'East Legon', lat: 5.6395, lng: -0.1582 },
      { name: 'Osu Oxford Street', lat: 5.556, lng: -0.182 },
      { name: 'Legon Campus (Univ of Ghana)', lat: 5.651, lng: -0.187 },
      { name: 'Spintex Road', lat: 5.625, lng: -0.11 },
      { name: 'Cantonments & Labone', lat: 5.58, lng: -0.175 },
      { name: 'Tema Community 1 & Harbour', lat: 5.6698, lng: -0.0166 },
      { name: 'Tema Community 25', lat: 5.72, lng: 0.035 },
      { name: 'Madina & Adenta', lat: 5.6833, lng: -0.1667 },
      { name: 'Dansoman & Sakaman', lat: 5.545, lng: -0.265 },
      { name: 'Achimota & Dome', lat: 5.62, lng: -0.228 },
      { name: 'Kasoa Boundary & Weija', lat: 5.558, lng: -0.334 },
      { name: 'Ashaiman Central', lat: 5.698, lng: -0.036 },
      { name: 'Dzorwulu & Abelemkpe', lat: 5.612, lng: -0.198 },
    ],
  },
  {
    id: 'ashanti',
    name: 'Ashanti Region',
    capital: 'Kumasi',
    center: [6.6885, -1.6244],
    zoom: 11,
    depot: {
      id: 'depot-kumasi',
      name: 'Kumasi Metropolitan Material Recovery Hub & Station',
      regionId: 'ashanti',
      regionName: 'Ashanti Region',
      lat: 6.672,
      lng: -1.615,
      address: 'Ahodwo Roundabout Industrial Zone, Kumasi',
      capacityDailyTons: 950,
      contactPhone: '+233 32 203 4455',
    },
    landfill: {
      id: 'landfill-oti',
      name: 'Oti-Dompoase Engineered Sanitary Landfill',
      regionId: 'ashanti',
      regionName: 'Ashanti Region',
      lat: 6.621,
      lng: -1.602,
      address: 'Dompoase / Oti Industrial Corridor, Kumasi',
      type: 'Engineered Sanitary Landfill',
    },
    towns: [
      { name: 'Ahodwo & Nhyiaeso', lat: 6.673, lng: -1.621 },
      { name: 'Asokwa Industrial Area', lat: 6.665, lng: -1.598 },
      { name: 'KNUST Campus & Ayeduase', lat: 6.6745, lng: -1.5716 },
      { name: 'Kejetia & Adum Central', lat: 6.696, lng: -1.625 },
      { name: 'Bantama & Suntreso', lat: 6.702, lng: -1.638 },
      { name: 'Tafo & Pankrono', lat: 6.738, lng: -1.615 },
      { name: 'Suame Magazine Industrial', lat: 6.718, lng: -1.636 },
      { name: 'Obuasi Gold City', lat: 6.202, lng: -1.668 },
      { name: 'Ejisu Municipality', lat: 6.715, lng: -1.488 },
      { name: 'Mampong Ashanti', lat: 7.062, lng: -1.401 },
      { name: 'Konongo-Odumase', lat: 6.618, lng: -1.218 },
    ],
  },
  {
    id: 'western',
    name: 'Western Region',
    capital: 'Sekondi-Takoradi',
    center: [4.9016, -1.7831],
    zoom: 11,
    depot: {
      id: 'depot-takoradi',
      name: 'Sekondi-Takoradi Maritime & Industrial Waste Depot',
      regionId: 'western',
      regionName: 'Western Region',
      lat: 4.895,
      lng: -1.765,
      address: 'Takoradi Harbour Industrial Area, Harbour Road',
      capacityDailyTons: 600,
      contactPhone: '+233 31 202 1188',
    },
    landfill: {
      id: 'landfill-sofokrom',
      name: 'Sofokrom Integrated Waste Recycling & Treatment Facility',
      regionId: 'western',
      regionName: 'Western Region',
      lat: 4.965,
      lng: -1.715,
      address: 'Sofokrom Bypass, Essipong District, Sekondi-Takoradi',
      type: 'Material Recovery & Recycling',
    },
    towns: [
      { name: 'Takoradi Market Circle', lat: 4.887, lng: -1.755 },
      { name: 'Beach Road & Chapel Hill', lat: 4.896, lng: -1.762 },
      { name: 'Sekondi Old Town & Essikado', lat: 4.938, lng: -1.712 },
      { name: 'Kwesimintsim & Anaji', lat: 4.912, lng: -1.785 },
      { name: 'Tarkwa Mining Hub', lat: 5.302, lng: -1.996 },
      { name: 'Axim Coastal Gateway', lat: 4.869, lng: -2.241 },
      { name: 'Bogoso Gold Mining District', lat: 5.561, lng: -2.015 },
      { name: 'Agona Nkwanta (Ahanta West)', lat: 4.886, lng: -1.968 },
    ],
  },
  {
    id: 'central',
    name: 'Central Region',
    capital: 'Cape Coast',
    center: [5.1053, -1.2466],
    zoom: 11,
    depot: {
      id: 'depot-capecoast',
      name: 'Cape Coast Regional Environmental Hub',
      regionId: 'central',
      regionName: 'Central Region',
      lat: 5.12,
      lng: -1.265,
      address: 'Pedu Junction / UCC West Gate Road, Cape Coast',
      capacityDailyTons: 450,
      contactPhone: '+233 33 213 7722',
    },
    landfill: {
      id: 'landfill-nkanfoa',
      name: 'Nkanfoa Modern Engineered Landfill Facility',
      regionId: 'central',
      regionName: 'Central Region',
      lat: 5.148,
      lng: -1.241,
      address: 'Nkanfoa Bypass, Cape Coast Metropolis',
      type: 'Engineered Sanitary Landfill',
    },
    towns: [
      { name: 'UCC Campus & Apewosika', lat: 5.115, lng: -1.285 },
      { name: 'Pedu & Abura', lat: 5.126, lng: -1.262 },
      { name: 'Cape Coast Castle / Heritage Core', lat: 5.103, lng: -1.241 },
      { name: 'Elmina Historic Coast', lat: 5.086, lng: -1.352 },
      { name: 'Kasoa Millennium City (Central Hub)', lat: 5.534, lng: -0.424 },
      { name: 'Winneba (UEW South Campus)', lat: 5.352, lng: -0.624 },
      { name: 'Mankessim Trading Hub', lat: 5.268, lng: -1.021 },
      { name: 'Saltpond Town', lat: 5.204, lng: -1.062 },
    ],
  },
  {
    id: 'eastern',
    name: 'Eastern Region',
    capital: 'Koforidua',
    center: [6.0945, -0.2591],
    zoom: 11,
    depot: {
      id: 'depot-koforidua',
      name: 'Koforidua Eastern Waste Logistics Depot',
      regionId: 'eastern',
      regionName: 'Eastern Region',
      lat: 6.088,
      lng: -0.252,
      address: 'Adweso Highway Depot, New Juaben South, Koforidua',
      capacityDailyTons: 400,
      contactPhone: '+233 34 202 3311',
    },
    landfill: {
      id: 'landfill-akosombo',
      name: 'Akwapim-Juaben Integrated Eco-Landfill',
      regionId: 'eastern',
      regionName: 'Eastern Region',
      lat: 6.135,
      lng: -0.231,
      address: 'Oyoko Industrial Valley, Eastern Region',
      type: 'Material Recovery & Recycling',
    },
    towns: [
      { name: 'Koforidua Central & Adweso', lat: 6.0945, lng: -0.2591 },
      { name: 'Nsawam Commercial Junction', lat: 5.808, lng: -0.35 },
      { name: 'Nkawkaw Kwahu Gateway', lat: 6.551, lng: -0.767 },
      { name: 'Suhum Municipality', lat: 6.041, lng: -0.452 },
      { name: 'Akosombo & VRA Township', lat: 6.298, lng: 0.048 },
      { name: 'Aburi & Akwapim Ridge', lat: 5.85, lng: -0.176 },
      { name: 'Somanya & Krobo Hub', lat: 6.155, lng: -0.015 },
      { name: 'Begoro Fanteakwa', lat: 6.386, lng: -0.381 },
    ],
  },
  {
    id: 'northern',
    name: 'Northern Region',
    capital: 'Tamale',
    center: [9.4042, -0.8393],
    zoom: 11,
    depot: {
      id: 'depot-tamale',
      name: 'Tamale Northern Metropolitan Transfer Station',
      regionId: 'northern',
      regionName: 'Northern Region',
      lat: 9.398,
      lng: -0.825,
      address: 'Industrial Area, Tamale-Yendi Road Corridor',
      capacityDailyTons: 500,
      contactPhone: '+233 37 202 5599',
    },
    landfill: {
      id: 'landfill-gbalahi',
      name: 'Gbalahi Integrated Recycling and Compost Plant (IRECoP)',
      regionId: 'northern',
      regionName: 'Northern Region',
      lat: 9.442,
      lng: -0.795,
      address: 'Gbalahi Eco Zone, Tamale North',
      type: 'Compost & Bio-Digestion Plant',
    },
    towns: [
      { name: 'Tamale Central & Aboabo', lat: 9.4042, lng: -0.8393 },
      { name: 'UDS Campus & Dungu', lat: 9.352, lng: -0.858 },
      { name: 'Vittin & Lamashegu', lat: 9.385, lng: -0.831 },
      { name: 'Sagnarigu Township', lat: 9.428, lng: -0.852 },
      { name: 'Yendi Historic Municipality', lat: 9.443, lng: -0.011 },
      { name: 'Savelugu Commercial Centre', lat: 9.625, lng: -0.828 },
      { name: 'Bimbilla Nanumba Hub', lat: 8.859, lng: 0.061 },
      { name: 'Kumbungu Agri-Centre', lat: 9.575, lng: -0.952 },
    ],
  },
  {
    id: 'volta',
    name: 'Volta Region',
    capital: 'Ho',
    center: [6.6111, 0.4706],
    zoom: 11,
    depot: {
      id: 'depot-ho',
      name: 'Ho Volta Regional Eco-Waste Center',
      regionId: 'volta',
      regionName: 'Volta Region',
      lat: 6.602,
      lng: 0.462,
      address: 'Sokode Road Industrial Zone, Ho Municipality',
      capacityDailyTons: 320,
      contactPhone: '+233 36 202 6677',
    },
    landfill: {
      id: 'landfill-akrofu',
      name: 'Akrofu Modern Engineered Landfill',
      regionId: 'volta',
      regionName: 'Volta Region',
      lat: 6.645,
      lng: 0.435,
      address: 'Akrofu Eco-Corridor, Ho West',
      type: 'Engineered Sanitary Landfill',
    },
    towns: [
      { name: 'Ho Central & UHAS Campus', lat: 6.6111, lng: 0.4706 },
      { name: 'Hohoe Municipal Hub', lat: 7.151, lng: 0.474 },
      { name: 'Aflao Border Gate', lat: 6.121, lng: 1.191 },
      { name: 'Keta Lagoon Heritage Hub', lat: 5.922, lng: 0.988 },
      { name: 'Sogakope Lower Volta', lat: 5.998, lng: 0.596 },
      { name: 'Anloga Eco-Town', lat: 5.792, lng: 0.898 },
      { name: 'Kpando Lakeside', lat: 6.997, lng: 0.293 },
    ],
  },
  {
    id: 'bono',
    name: 'Bono Region',
    capital: 'Sunyani',
    center: [7.3399, -2.3268],
    zoom: 11,
    depot: {
      id: 'depot-sunyani',
      name: 'Sunyani Bono Regional Logistics Hub',
      regionId: 'bono',
      regionName: 'Bono Region',
      lat: 7.345,
      lng: -2.315,
      address: 'Abesim Corridor Depot, Sunyani Metropolis',
      capacityDailyTons: 350,
      contactPhone: '+233 35 202 7788',
    },
    landfill: {
      id: 'landfill-sunyani',
      name: 'Sunyani Sanitary Landfill & Bio-Recycler',
      regionId: 'bono',
      regionName: 'Bono Region',
      lat: 7.375,
      lng: -2.298,
      address: 'Fiapre Road Industrial Zone, Sunyani',
      type: 'Material Recovery & Recycling',
    },
    towns: [
      { name: 'Sunyani Central & Fiapre (UENR)', lat: 7.3399, lng: -2.3268 },
      { name: 'Berekum Commercial Hub', lat: 7.454, lng: -2.584 },
      { name: 'Dormaa Ahenkro Border Gateway', lat: 7.279, lng: -2.879 },
      { name: 'Wenchi Historic City', lat: 7.739, lng: -2.105 },
      { name: 'Abesim Agro-Town', lat: 7.318, lng: -2.285 },
    ],
  },
  {
    id: 'bono_east',
    name: 'Bono East Region',
    capital: 'Techiman',
    center: [7.5828, -1.9395],
    zoom: 11,
    depot: {
      id: 'depot-techiman',
      name: 'Techiman Central Agricultural Waste Depot',
      regionId: 'bono_east',
      regionName: 'Bono East',
      lat: 7.591,
      lng: -1.932,
      address: 'Techiman International Market Logistics Area',
      capacityDailyTons: 420,
      contactPhone: '+233 35 252 8844',
    },
    landfill: {
      id: 'landfill-techiman',
      name: 'Techiman Bio-Composting & Solid Waste Complex',
      regionId: 'bono_east',
      regionName: 'Bono East',
      lat: 7.615,
      lng: -1.912,
      address: 'Kenten Eco Corridor, Techiman',
      type: 'Compost & Bio-Digestion Plant',
    },
    towns: [
      { name: 'Techiman Central & Market Area', lat: 7.5828, lng: -1.9395 },
      { name: 'Kintampo Waterfalls Valley', lat: 8.056, lng: -1.731 },
      { name: 'Atebubu Grain Hub', lat: 7.755, lng: -0.994 },
      { name: 'Nkoranza Agricultural Centre', lat: 7.568, lng: -1.701 },
      { name: 'Yeji Volta River Port', lat: 8.225, lng: -0.652 },
    ],
  },
  {
    id: 'upper_east',
    name: 'Upper East Region',
    capital: 'Bolgatanga',
    center: [10.7856, -0.8514],
    zoom: 11,
    depot: {
      id: 'depot-bolga',
      name: 'Bolgatanga Upper East Regional Collection Hub',
      regionId: 'upper_east',
      regionName: 'Upper East',
      lat: 10.778,
      lng: -0.842,
      address: 'Navrongo Road Logistics Yard, Bolgatanga',
      capacityDailyTons: 280,
      contactPhone: '+233 38 202 4433',
    },
    landfill: {
      id: 'landfill-bolga',
      name: 'Bolgatanga Solid Waste Management Site',
      regionId: 'upper_east',
      regionName: 'Upper East',
      lat: 10.812,
      lng: -0.825,
      address: 'Sumbrungu Eco Zone, Bolgatanga',
      type: 'Engineered Sanitary Landfill',
    },
    towns: [
      { name: 'Bolgatanga Central & Crafts Market', lat: 10.7856, lng: -0.8514 },
      { name: 'Bawku Commercial Border Hub', lat: 11.055, lng: -0.242 },
      { name: 'Navrongo (CKTED University)', lat: 10.895, lng: -1.092 },
      { name: 'Paga Crocodile Sanctuary Gateway', lat: 10.988, lng: -1.112 },
      { name: 'Sandema Builsa Hub', lat: 10.655, lng: -1.285 },
    ],
  },
  {
    id: 'upper_west',
    name: 'Upper West Region',
    capital: 'Wa',
    center: [10.0601, -2.5099],
    zoom: 11,
    depot: {
      id: 'depot-wa',
      name: 'Wa Upper West Environmental Logistics Centre',
      regionId: 'upper_west',
      regionName: 'Upper West',
      lat: 10.052,
      lng: -2.498,
      address: 'Dorimon Road Industrial Quarter, Wa',
      capacityDailyTons: 240,
      contactPhone: '+233 39 202 1155',
    },
    landfill: {
      id: 'landfill-wa',
      name: 'Wa Municipal Integrated Landfill',
      regionId: 'upper_west',
      regionName: 'Upper West',
      lat: 10.088,
      lng: -2.482,
      address: 'Siriyiri Eco Reserve Area, Wa',
      type: 'Engineered Sanitary Landfill',
    },
    towns: [
      { name: 'Wa Central & UBIDS Campus', lat: 10.0601, lng: -2.5099 },
      { name: 'Lawra Black Volta District', lat: 10.648, lng: -2.898 },
      { name: 'Jirapa Township', lat: 10.351, lng: -2.705 },
      { name: 'Nandom Heritage Hub', lat: 10.855, lng: -2.756 },
      { name: 'Tumu Sissala East Hub', lat: 10.875, lng: -1.978 },
    ],
  },
  {
    id: 'ahafo',
    name: 'Ahafo Region',
    capital: 'Goaso',
    center: [6.8041, -2.5186],
    zoom: 11,
    depot: {
      id: 'depot-goaso',
      name: 'Goaso Ahafo Green Forest Hub',
      regionId: 'ahafo',
      regionName: 'Ahafo',
      lat: 6.812,
      lng: -2.508,
      address: 'Goaso-Mim Highway Depot',
      capacityDailyTons: 200,
      contactPhone: '+233 35 219 4400',
    },
    landfill: {
      id: 'landfill-goaso',
      name: 'Goaso Eco-Sanitary Facility',
      regionId: 'ahafo',
      regionName: 'Ahafo',
      lat: 6.825,
      lng: -2.492,
      address: 'Mim Forest Boundary, Ahafo',
      type: 'Material Recovery & Recycling',
    },
    towns: [
      { name: 'Goaso Central', lat: 6.8041, lng: -2.5186 },
      { name: 'Kenyasi Mining Corridor (Newmont)', lat: 6.985, lng: -2.385 },
      { name: 'Duayaw Nkwanta', lat: 7.168, lng: -2.095 },
      { name: 'Mim Timber Hub', lat: 6.902, lng: -2.578 },
    ],
  },
  {
    id: 'western_north',
    name: 'Western North Region',
    capital: 'Sefwi Wiawso',
    center: [6.2081, -2.4842],
    zoom: 11,
    depot: {
      id: 'depot-wiawso',
      name: 'Sefwi Wiawso Cocoa & Forest Waste Depot',
      regionId: 'western_north',
      regionName: 'Western North',
      lat: 6.215,
      lng: -2.475,
      address: 'Dwinase Industrial Zone, Sefwi Wiawso',
      capacityDailyTons: 210,
      contactPhone: '+233 31 232 5511',
    },
    landfill: {
      id: 'landfill-wiawso',
      name: 'Wiawso Integrated Compost Facility',
      regionId: 'western_north',
      regionName: 'Western North',
      lat: 6.232,
      lng: -2.461,
      address: 'Asafo Corridor, Sefwi Wiawso',
      type: 'Compost & Bio-Digestion Plant',
    },
    towns: [
      { name: 'Sefwi Wiawso & Dwinase', lat: 6.2081, lng: -2.4842 },
      { name: 'Bibiani Mining Town', lat: 6.465, lng: -2.318 },
      { name: 'Juaboso Forest Hub', lat: 6.338, lng: -2.831 },
      { name: 'Enchi Aowin Gateway', lat: 5.821, lng: -2.825 },
    ],
  },
  {
    id: 'oti',
    name: 'Oti Region',
    capital: 'Dambai',
    center: [7.6711, 0.1794],
    zoom: 11,
    depot: {
      id: 'depot-dambai',
      name: 'Dambai Oti River Basin Waste Hub',
      regionId: 'oti',
      regionName: 'Oti Region',
      lat: 7.665,
      lng: 0.185,
      address: 'Lakeside Commercial Zone, Dambai',
      capacityDailyTons: 180,
      contactPhone: '+233 36 219 7733',
    },
    landfill: {
      id: 'landfill-dambai',
      name: 'Dambai Regional Sanitary Landfill',
      regionId: 'oti',
      regionName: 'Oti Region',
      lat: 7.695,
      lng: 0.198,
      address: 'Chinderi Junction Corridor, Dambai',
      type: 'Engineered Sanitary Landfill',
    },
    towns: [
      { name: 'Dambai Port Hub', lat: 7.6711, lng: 0.1794 },
      { name: 'Nkwanta North & South', lat: 8.258, lng: 0.518 },
      { name: 'Jasikan Municipality', lat: 7.411, lng: 0.468 },
      { name: 'Kadjebi Mountain Gateway', lat: 7.525, lng: 0.548 },
    ],
  },
  {
    id: 'savannah',
    name: 'Savannah Region',
    capital: 'Damongo',
    center: [9.0825, -1.8217],
    zoom: 10,
    depot: {
      id: 'depot-damongo',
      name: 'Damongo Savannah Ecological Waste Depot',
      regionId: 'savannah',
      regionName: 'Savannah',
      lat: 9.075,
      lng: -1.812,
      address: 'Mole National Park Road, Damongo',
      capacityDailyTons: 160,
      contactPhone: '+233 37 219 2200',
    },
    landfill: {
      id: 'landfill-damongo',
      name: 'Damongo Eco-Disposal & Composting Centre',
      regionId: 'savannah',
      regionName: 'Savannah',
      lat: 9.098,
      lng: -1.795,
      address: 'Larabanga Bypass, Damongo',
      type: 'Compost & Bio-Digestion Plant',
    },
    towns: [
      { name: 'Damongo Central & Mole Gate', lat: 9.0825, lng: -1.8217 },
      { name: 'Bole Commercial Corridor', lat: 9.034, lng: -2.482 },
      { name: 'Salaga Historic Trading Hub', lat: 8.552, lng: -0.518 },
      { name: 'Buipe Industrial Port & River Port', lat: 8.785, lng: -1.538 },
      { name: 'Daboya Smock Weaving Town', lat: 9.531, lng: -1.385 },
    ],
  },
  {
    id: 'north_east',
    name: 'North East Region',
    capital: 'Nalerigu',
    center: [10.5318, -0.3708],
    zoom: 11,
    depot: {
      id: 'depot-nalerigu',
      name: 'Nalerigu-Gambaga North East Logistics Hub',
      regionId: 'north_east',
      regionName: 'North East',
      lat: 10.525,
      lng: -0.362,
      address: 'Nalerigu Escarpment Corridor',
      capacityDailyTons: 150,
      contactPhone: '+233 37 219 8811',
    },
    landfill: {
      id: 'landfill-nalerigu',
      name: 'Nalerigu Solid Waste Facility',
      regionId: 'north_east',
      regionName: 'North East',
      lat: 10.548,
      lng: -0.351,
      address: 'Gambaga Ridge Eco Site, Nalerigu',
      type: 'Engineered Sanitary Landfill',
    },
    towns: [
      { name: 'Nalerigu Central & Baptist Hospital', lat: 10.5318, lng: -0.3708 },
      { name: 'Walewale Commercial Transit Hub', lat: 10.508, lng: -0.798 },
      { name: 'Gambaga Historic Centre', lat: 10.531, lng: -0.442 },
      { name: 'Chereponi Border Town', lat: 10.138, lng: 0.288 },
      { name: 'Bunkpurugu Escarpment', lat: 10.552, lng: 0.098 },
    ],
  },
];

// Haversine formula
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function getAllGhanaDepots(): GhanaDepot[] {
  return GHANA_REGIONS.map((r) => r.depot);
}

export function getAllGhanaLandfills(): GhanaLandfill[] {
  return GHANA_REGIONS.map((r) => r.landfill);
}

export function getNearestGhanaDepot(lat: number, lng: number): GhanaDepot {
  let nearest = GHANA_REGIONS[0].depot;
  let minDistance = Infinity;

  for (const region of GHANA_REGIONS) {
    const dist = calculateDistanceKm(lat, lng, region.depot.lat, region.depot.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = region.depot;
    }
  }

  return nearest;
}

export function getNearestGhanaLandfill(lat: number, lng: number): GhanaLandfill {
  let nearest = GHANA_REGIONS[0].landfill;
  let minDistance = Infinity;

  for (const region of GHANA_REGIONS) {
    const dist = calculateDistanceKm(lat, lng, region.landfill.lat, region.landfill.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = region.landfill;
    }
  }

  return nearest;
}

export function findRegionForLocation(lat: number, lng: number): GhanaRegion {
  let nearest = GHANA_REGIONS[0];
  let minDistance = Infinity;

  for (const region of GHANA_REGIONS) {
    const dist = calculateDistanceKm(lat, lng, region.center[0], region.center[1]);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = region;
    }
  }

  return nearest;
}
