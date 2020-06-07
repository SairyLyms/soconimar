$(window).resize(function () {
    var h = $(window).height(),
      offsetTop = 125; // Calculate the top offset
  
    $('#mapCanvas').css('height', (h - offsetTop));
  }).resize();

var map;
var currentPositionMarker;
var searchedPlaceMarkers = [];
var searchedPlaceCircles = [];
var language = navigator.language;
var radius;
document.addEventListener("DOMContentLoaded", function(){
    //document.getElementById("search").onclick = buttonClickHandler;
    initMap([38.4874154,140.375671]);
}
)

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
            handleLocationError(true, infoWindow, map.getCenter());
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