$(window).resize(function () {
    var h = $(window).height(),
      offsetTop = 125; // Calculate the top offset
  
    $('#mapCanvas').css('height', (h - offsetTop));
  }).resize();
 

var map;
var currentPositionMarker;
var genreObject ={}
var placeDataList = [];
var Markers = [];
var Circles = [];
var language = navigator.language;
var radius;
var genre1Set = new Set()
var genre2Set = new Set() 
var genre3Set = new Set()
var genreQuery = ""



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
    map.addControl(new mapboxgl.ScaleControl());
    getGenreObject();

} 

let getGenreObject = async () => {
    await $.getJSON("genre.json",function(json) {
        genreObject =  json;
     });

    genreObject.unshift({"業種コード1":"","業種コード2":"","業種コード3":"","業種名1":"未選択","業種名2":"未選択","業種名3":"未選択"})

     genreObject.forEach(el => {
         genre1Set[el["業種コード1"]] = el["業種名1"]
         genre2Set[el["業種コード2"]] = el["業種名2"]
         genre3Set[el["業種コード3"]] = el["業種名3"] 
        }) 

     repalceOptions("#genre1Selector",genre1Set);
     repalceOptions("#genre2Selector",genre2Set);
     repalceOptions("#genre3Selector",genre3Set); 
}

var repalceOptions = (elementId,newOptions) => {
    $(elementId).empty(); // remove old options
    $.each(newOptions,(value,key) => {
        $(elementId).append($("<option></option>")
       .attr("value", value).text(key));
    });}


//業種が変更された場合の動作
$("#genre1Selector, #genre2Selector, #genre3Selector").change( event => {
    let value = event.currentTarget.value;
    if(event.target.id == "genre1Selector"){
        //大分類が選択された場合
        let genre2Options = Object.keys(genre2Set).reduce((a,key) => {if(key.slice(0,2) == value || key == ""){a[key] = genre2Set[key]}return a},{})
        let genre3Options = Object.keys(genre3Set).reduce((a,key) => {if(key.slice(0,2) == value || key == ""){a[key] = genre3Set[key]}return a},{})
        repalceOptions("#genre2Selector",genre2Options);repalceOptions("#genre3Selector",genre3Options);
    }
    else if(event.target.id == "genre2Selector"){
        //中分類が選択された場合
        let genre3Options = Object.keys(genre3Set).reduce((a,key) => {if(key.slice(0,4) == value || key == ""){a[key] = genre3Set[key]}return a},{})
        repalceOptions("#genre3Selector",genre3Options);
    }
    genreQuery = value;
})

    
let searchAndDraw = async () => {

    var query = document.getElementById("placeToSearch").value;
    var dist = 20;
    var url = new URL("https://map.yahooapis.jp/search/local/V1/localSearch");
    url.search = new URLSearchParams({
        appid : "dj00aiZpPTJ1czdha250dHdvTSZzPWNvbnN1bWVyc2VjcmV0Jng9Yjg-",
        sort : "dist",
        results : 100,
        output : "json",
        query : query,
        lat : map.getCenter().lat,
        lon : map.getCenter().lng,
        dist : dist,
        gc : genreQuery,
        start : 1
    });

    //業種検索のテスト
    //https://map.yahooapis.jp/search/local/V1/localSearch?appid=dj00aiZpPTJ1czdha250dHdvTSZzPWNvbnN1bWVyc2VjcmV0Jng9Yjg-&gc=413001&lat=38.4769442&lon=140.3838833
    "https://map.yahooapis.jp/search/local/V1/localSearch?appid=dj00aiZpPTJ1czdha250dHdvTSZzPWNvbnN1bWVyc2VjcmV0Jng9Yjg-&sort=dist&results=100&output=json&query=&lat=38.4769442&lon=140.3838833&dist=20&gc=&start=1"
    var result;
    try {
        //console.log(url) 
        result = await getEntireResultsList(url);
/*
        await fetch(url)
        .then(response => response.json())
        .then(json => {
            console.log(json);
            
            var searchParam = new URLSearchParams(url.search);
            console.log(searchParam)
            result = json["Feature"];
        })
*/
    }
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
    console.log(result)
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

const getResults = async function(url,pageNo = 1) {
    console.log(url)
    var searchParam = new URLSearchParams(url.search)
    console.log(searchParam.toString())
    searchParam.set("start",pageNo);
    url.search = searchParam; 
    console.log(url)
    var apiResults = await fetch(url)
        .then(resp => resp.json());
    return apiResults;
}

const getEntireResultsList = async function(url,pageNo = 1) {
  var searchParam = new URLSearchParams(url.search)
  const apiResults = await getResults(url,pageNo);
  const results = apiResults["Feature"]
  //console.log("Retreiving data from API for page : " + pageNo);
  
  if (apiResults.ResultInfo.Count >= parseInt(searchParam.get("results"))) {
    //console.log(results)
    return results.concat(await getEntireResultsList(url,pageNo+1*parseInt(searchParam.get("results"))));
  } else {
    //console.log(results)
    return results;
  }
};

let clearAll = () => {
    placeDataList.forEach(element => {
        element.marker.remove();
        element.circle.remove();
        element.popup.remove();
    })
    placeDataList = [];
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



