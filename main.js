$(window).resize(function () {
    var h = $(window).height(),
      offsetTop = 125; // Calculate the top offset
  
    $('#mapCanvas').css('height', (h - offsetTop));
  }).resize();
 

var map;
var currentPositionMarker;
var placeDataList = [];
var Markers = [];
var Circles = [];
var language = navigator.language;
var radius;

document.addEventListener("DOMContentLoaded", function(){
    //document.getElementById("search").onclick = buttonClickHandler;
    init();
}
)

let init = () => {
    map = new mapboxgl.Map({
        container: 'mapCanvas',
        style: './lib/std.json', // stylesheet location
        //center: [139.767144, 35.680621],
        center: [140.3838833,38.4769442],  
        zoom: 12,
        maxZoom: 17.99,
        minZoom: 4,
        localIdeographFontFamily: false
        });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.ScaleControl() );


    $.getJSON("genre.json",function(json) {
        console.log(json); // this will show the info it in firebug console
    });

} 

let searchAndDraw = async () => {

    var query = document.getElementById("placeToSearch").value;
    var dist = 20;

    var result;
    try {
        var url = new URL("https://map.yahooapis.jp/search/local/V1/localSearch");
        url.search = new URLSearchParams({
            appid : "dj00aiZpPTJ1czdha250dHdvTSZzPWNvbnN1bWVyc2VjcmV0Jng9Yjg-",
            sort : "dist",
            results : "100",
            output : "json",
            query : query,
            lat : map.getCenter().lat,
            lon : map.getCenter().lng,
            dist: dist
        });

        //業種検索のテスト
        //https://map.yahooapis.jp/search/local/V1/localSearch?appid=dj00aiZpPTJ1czdha250dHdvTSZzPWNvbnN1bWVyc2VjcmV0Jng9Yjg-&gc=413001&lat=38.4769442&lon=140.3838833

        await fetch(url)
        .then(response => { return response.json(); })
        .then(json => {
            console.log(json);
            result = json["Feature"];
        })}
    catch(err){console.log("something went wrong: " + err.message)}

    //重複要素(Gidが重複する要素)の削除
    let buf = []; 
    result.forEach(v => {
        if(!buf.map(item => item["Gid"]).includes(v["Gid"])){
            buf.push(v);
            console.log(v["Name"]);
        }
    });
    result = buf;

   //検索結果の表示
   result.forEach(item => {
    let lng = parseFloat(item.Geometry.Coordinates.split(",")[0]);
    let lat = parseFloat(item.Geometry.Coordinates.split(",")[1]);
    let radius = document.getElementById("raduisToDraw").value * 1000;  
    let color = pickr.getColor().toHEXA().toString()

    var circle = new MapboxCircle({lat: lat, lng:lng}, radius, {
        editable: false,
        fillColor: color
        }).addTo(map);

    var googleSearchURL = new URL("https://google.com/search")
    googleSearchURL.search = new URLSearchParams({q : item.Name + " " + item.Property.Address})
    
   // let link = $("<a>").attr({href : googleSearchURL.toString(),target: '_blank'});

    var info = $("<div>").append($("<a>").attr({href : googleSearchURL.toString(),target: '_blank'})
                .append($("<h5>").text(item.Name)))
                .append($("<ul>")
                .append($("<li>").text(item.Property.Address))
                .append($("<li>").text(item.Property.Tel1))
                ).html();
    var popup = new mapboxgl.Popup({maxWidth:320})
        .setHTML(info);


    var marker = new mapboxgl.Marker({color: color})
        .setLngLat([lng,lat])
        .setPopup(popup)
        .addTo(map);

        placeDataList.push({item : item, color : color, marker : marker, circle : circle, popup : popup});
    });
    placeDataList
}

let clearAll = () => {
    placeDataList.forEach(element => {
        element.marker.remove();
        element.circle.remove();
        element.popup.remove();
    })
    placeDataList = [];
}



function initMap(latLng) {
    var latLng = {lat: latLng[0], lng: latLng[1]};
    map = new google.maps.Map(document.getElementById("mapCanvas"), {
        zoom: 13,
        center: latLng
    });
}

function buttonClickHandler() {
    //Todo:エラーハンドリングも実装する。
    var latLngBounds = map.getBounds();
    var keyword = document.getElementById("placeToSearch").value;
    radius = document.getElementById("raduisToDraw").value * 1000; 

    searchPlace(latLngBounds,keyword);
}

//中心地点の設定
let setCenterPlace = () => {
    let keyword = document.getElementById("placeToCenter").value;
    let requst = {
        query : keyword,
        locationBias : map.getBounds(),
        fields: ['name', 'geometry'],
    };

    service = new google.maps.places.PlacesService(map)
    service.findPlaceFromQuery(requst,(result,status,pagination)=>{
       if(status === google.maps.places.PlacesServiceStatus.OK){
            moveCenterPosition(result[0].geometry.location);
        }
    });
}

let searchPlace = (latLngBounds,keyword) => {
    let requst = {
        bounds : latLngBounds,
        query : keyword,
        color : pickr.getColor().toHEXA().toString(),
        radius : radius
    };
    let results = []
    service = new google.maps.places.PlacesService(map)
    service.textSearch(requst,(result,status,pagination)=>{
        if(status === google.maps.places.PlacesServiceStatus.OK){
            result.forEach(element => results.push(element));
            //検索結果の読み込みが継続する場合
            if(pagination.hasNextPage){
                pagination.nextPage();
            }
            else{
            //読み込み完了後の処理
            displayResult(results);
            }
        }
    });
}


//検索結果の表示
let displayResult = (results) => {
    results.forEach(element => {
        addMarkerPlaces(map,element);
        addCercleAroundPlaces(map,element,radius);
    });
}

//マーカーと円のクリア
let clearall = () => {

    currentPositionMarker.setMap(null);
    currentPositionMarker = null;

    // 表示しているマーカーの初期化
    searchedPlaceMarkers.forEach(element => element.setMap(null));
    searchedPlaceMarkers = [];

    //表示している円の初期化
    searchedPlaceCircles.forEach(element => element.setMap(null));
    searchedPlaceCircles = [];
}


//現在地の取得と表示
function getCurrentPosition(){
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
            };
            moveCenterPosition(pos);
                     
        }, function() {
            handleLocationError(false, infoWindow, map.getCenter());
        });
        } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
        }
    }
    

//現在地取得不可の場合
function handleLocationError(browserHasGeolocation, infoWindow, pos)
{
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
                          'Error: The Geolocation service failed.' :
                          'Error: Your browser doesn\'t support geolocation.');
    infoWindow.open(map);
}

let moveCenterPosition = (pos) => {
    map.panTo(pos);

    currentPositionMarker = new MarkerWithLabel({
        map: map,
        position: pos,
        icon: {
            url:'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
            scaledSize : new google.maps.Size(32, 32)
        },
        //labelContent: "",                              //ラベル文字
        //labelAnchor: new google.maps.Point(-10, 25),   //ラベル文字の基点
        //labelClass: 'mapLabels',                       //CSSのクラス名
        //labelStyle: {opacity: 0.8},                    //透過度
        animation: google.maps.Animation.DROP,
    });
}

let addMarkerPlaces = (map,element) => {
    var marker = new MarkerWithLabel({
        map: map,
        position: element.geometry.location,
        icon: {
            url:'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize : new google.maps.Size(32, 32)
        },
        labelContent: element.name,                    //ラベル文字
        labelAnchor: new google.maps.Point(-10, 25),   //ラベル文字の基点
        labelClass: 'mapLabels',                       //CSSのクラス名
        labelStyle: {opacity: 0.8},                    //透過度
        animation: google.maps.Animation.DROP,
    });
    searchedPlaceMarkers.push(marker)
}

let addCercleAroundPlaces = (map,element,radius) => {
    var circle = new google.maps.Circle({
        map: map,
        center: element.geometry.location,
        radius : radius,
        strokeColor : pickr.getColor().toHEXA().toString(),
        strokeOpacity: 0.8,
        fillColor : pickr.getColor().toHEXA().toString(),
        fillOpacity: 0.35
    });
    searchedPlaceCircles.push(circle)
}

//カラーピッカー
// Simple example, see optional options for more configuration.
const pickr = Pickr.create({
    el: '.color-picker',
    theme: 'nano', // or 'monolith', or 'nano'
    default: '#0275d8',
    swatches: [
        'rgba(244, 67, 54, 1)',
        'rgba(233, 30, 99, 1)',
        'rgba(156, 39, 176, 1)',
        'rgba(103, 58, 183, 1)',
        'rgba(63, 81, 181,  1)',
        'rgba(33, 150, 243, 1)',
        'rgba(3, 169, 244,  1)',
        'rgba(0, 188, 212,  1)',
        'rgba(0, 150, 136,  1)',
        'rgba(76, 175, 80,  1)',
        'rgba(139, 195, 74, 1)',
        'rgba(205, 220, 57, 1)',
        'rgba(255, 235, 59, 1)',
        'rgba(255, 193, 7, 1)'
    ],

    components: {

        // Main components
        preview: false,
        opacity: false,
        hue: false,

        // Input / output Options
        interaction: {
            hex: false,
            rgba: false,
            hsla: false,
            hsva: false,
            cmyk: false,
            input: false,
            clear: false,
            save: true
        }
    },
    i18n:{
        "btn:save":"保存"
    }
});






//var baseLayers = {"地理院タイル（標準地図）": std,"地理院タイル（オルソ）": ort,"地理院タイル（白地図）": blank};
var baseLayers ={};
//var overlays = {'地図情報（注記）': annolayer,'地図情報（道路中心線）': rdcllayer,'地図情報（鉄道中心線）': raillayer,'地図情報（河川中心線）': rvrcllayer,'基盤地図情報_基本項目': fgdlayer,'基盤地図情報_数値標高モデル（10m）': dem10blayer,'基盤地図情報_数値標高モデル（5m）': dem5alayer,'地形分類（自然地形）': landformclassification1layer,'地形分類（人工地形）': landformclassification2layer,'地名情報（居住地名）': nrptlayer,'地名情報（自然地名）': nnfptlayer,'地名情報（公共施設）': pfptlayer,'地名情報（住居表示住所）': jhjlayer,"地理院タイル（標準地図）": std,"地理院タイル（オルソ）": ort,"地理院タイル（白地図）": blank};



var vectorTileStyling = {

    water: {
        fill: false,
        weight: 1,
        fillColor: '#06cccc',
        color: '#06cccc',
        fillOpacity: 0.2,
        opacity: 0.4,
    },
    admin: {
        weight: 1,
        fillColor: 'pink',
        color: 'pink',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    waterway: {
        weight: 1,
        fillColor: '#2375e0',
        color: '#2375e0',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    landcover: {
        fill: false,
        weight: 1,
        fillColor: '#53e033',
        color: '#53e033',
        fillOpacity: 0.2,
        opacity: 0.4,
    },
    landuse: {
        fill: false,
        weight: 1,
        fillColor: '#e5b404',
        color: '#e5b404',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    park: {
        fill: false,
        weight: 1,
        fillColor: '#84ea5b',
        color: '#84ea5b',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    boundary: {
        weight: 1,
        fillColor: '#c545d3',
        color: '#c545d3',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    aeroway: {
        weight: 1,
        fillColor: '#51aeb5',
        color: '#51aeb5',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    road: {	// mapbox & nextzen only
        weight: 1,
        fillColor: '#f2b648',
        color: '#f2b648',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    tunnel: {	// mapbox only
        weight: 0.5,
        fillColor: '#f2b648',
        color: '#f2b648',
        fillOpacity: 0.2,
        opacity: 0.4,
// 					dashArray: [4, 4]
    },
    bridge: {	// mapbox only
        weight: 0.5,
        fillColor: '#f2b648',
        color: '#f2b648',
        fillOpacity: 0.2,
        opacity: 0.4,
// 					dashArray: [4, 4]
    },
    transportation: {	// openmaptiles only
        weight: 0.5,
        fillColor: '#f2b648',
        color: '#f2b648',
        fillOpacity: 0.2,
        opacity: 0.4,
// 					dashArray: [4, 4]
    },
    transit: {	// nextzen only
        weight: 0.5,
        fillColor: '#f2b648',
        color: '#f2b648',
        fillOpacity: 0.2,
        opacity: 0.4,
// 					dashArray: [4, 4]
    },
    building: {
        fill: false,
        weight: 1,
        fillColor: '#2b2b2b',
        color: '#2b2b2b',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    water_name: {
        weight: 1,
        fillColor: '#022c5b',
        color: '#022c5b',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    transportation_name: {
        weight: 1,
        fillColor: '#bc6b38',
        color: '#bc6b38',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    place: {
        weight: 1,
        fillColor: '#f20e93',
        color: '#f20e93',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    housenumber: {
        weight: 1,
        fillColor: '#ef4c8b',
        color: '#ef4c8b',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    poi: {
        weight: 1,
        fillColor: '#3bb50a',
        color: '#3bb50a',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    earth: {	// nextzen only
        fill: false,
        weight: 1,
        fillColor: '#c0c0c0',
        color: '#c0c0c0',
        fillOpacity: 0.2,
        opacity: 0.4
    },


    // Do not symbolize some stuff for mapbox
    country_label: [],
    marine_label: [],
    state_label: [],
    place_label: [],
    waterway_label: [],
    poi_label: [],
    road_label: [],
    housenum_label: [],


    // Do not symbolize some stuff for openmaptiles
    country_name: [],
    marine_name: [],
    state_name: [],
    place_name: [],
    waterway_name: [],
    poi_name: [],
    road_name: [],
    housenum_name: [],
};
    // Monkey-patch some properties for nextzen layer names, because
    // instead of "building" the data layer is called "buildings" and so on
    vectorTileStyling.buildings  = vectorTileStyling.building;
    vectorTileStyling.boundaries = vectorTileStyling.boundary;
    vectorTileStyling.places     = vectorTileStyling.place;
    vectorTileStyling.pois       = vectorTileStyling.poi;
    vectorTileStyling.roads      = vectorTileStyling.road;
