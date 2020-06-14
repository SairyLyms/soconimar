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
var layerIDs = [];
var population2020JSON;


document.addEventListener("DOMContentLoaded", function(){
    init();
}
)

let init = () => {
    map = new mapboxgl.Map({
        container: 'mapCanvas',
        //style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
        style: './lib/std.json', // stylesheet location
        center: [139.767125,35.681236],  
        zoom: 12,
        maxZoom: 17.99,
        minZoom: 4,
        localIdeographFontFamily: false,
        preserveDrawingBuffer: true
        });
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
        enableHighAccuracy: true
        },
            trackUserLocation: true
        }),'top-left');
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');
    map.addControl(new mapboxgl.ScaleControl(),"bottom-right");

 /* 1kmメッシュ人口データ
    $.getJSON("pop2020.topojson",function(x){
        //console.log(x)
        population2020JSON = topojson.feature(x, x.objects.pop2020)
        //console.log(population2020JSON)
    });
*/
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
    var alertZeroResult = document.getElementById("alertSeachResultIsZero");
    var dist = 20;

    //業種検索のテスト
    //https://map.yahooapis.jp/search/local/V1/localSearch?callback=?appid=dj00aiZpPVFubmU4Z3dLaXBMeCZzPWNvbnN1bWVyc2VjcmV0Jng9ZmI-&gc=0413001&lat=38.4769442&lon=140.3838833&output=json
    "https://map.yahooapis.jp/search/local/V1/localSearch?appid=dj00aiZpPTJ1czdha250dHdvTSZzPWNvbnN1bWVyc2VjcmV0Jng9Yjg-&sort=dist&results=100&output=json&query=&lat=38.4769442&lon=140.3838833&dist=20&gc=&start=1&callback=showResult"
    var result;

    var url = "https://map.yahooapis.jp/search/local/V1/localSearch?appid=dj00aiZpPVFubmU4Z3dLaXBMeCZzPWNvbnN1bWVyc2VjcmV0Jng9ZmI-&output=json&callback=?"
    var searchParam =  {
        sort : "dist",
        results : 100,
        query : query,
        lat : map.getCenter().lat,
        lon : map.getCenter().lng,
        dist : dist,
        gc : genreQuery,
        start : 1,
    }
    try {
        alertZeroResult.style.visibility = "hidden"
        result = await getEntireJsonResultsList(url,searchParam);
        console.log(result) 
    }
    catch(err){
        console.log("something went wrong: " + err.message)
        alertZeroResult.style.visibility = "visible" 
    }



    var idBase = result.features[0].properties.keyWord + "@" + result.features[0].properties.baseCoordinates[0].toString() + "+" + result.features[0].properties.baseCoordinates[1].toString()
    
    map.addSource(idBase, {
        'type': 'geojson',
        "data": result
    });
/*
    map.addSource("population2020", {
        'type': 'geojson',
        "data": population2020JSON
    });
*/
    map.addLayer({
        'id': idBase + "&circles",
        'type': 'circle',
        'source': idBase,
        'paint': {
        'circle-radius': {
            stops: [[0, 0],
                    [20, metersToPixelsAtMaxZoom(document.getElementById("raduisToDraw").value * 1000, map.getCenter().lat)]],
            base: 2},
        'circle-color': ["get","marker-color"],
        "circle-opacity": ['interpolate',['linear'],
                          ['zoom'],10,0.1,20,0.03],
        "circle-stroke-width": 1,
        "circle-stroke-color": ["get","marker-color"],
        "circle-stroke-opacity":['interpolate',['linear'],
                                ['zoom'],10,0.8,20,0.03]
        },
        });

    map.addLayer({
        'id': idBase +"&markers",
        'type': 'circle',
        'source': idBase,
        'paint': {
        'circle-radius': 6,
        'circle-color': ["get","marker-color"],
        "circle-opacity": 0.5,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#FFF"
        },
        });
/*
    map.addLayer(
        {
        'id': 'population2020',
        'type': 'fill',
        'source': "population2020",
        'layout': {},
        'paint': {
        'fill-color': '#f08',
        'fill-opacity': 0.4
        }
    });
*/
    //ヒートマップ
    map.addLayer(
        {
        'id': idBase +"&heatmap",
        'type': 'heatmap',
        'source': idBase,
        //'maxzoom': 9,
        'paint': {
        // Increase the heatmap weight based on frequency and property magnitude
        //'heatmap-weight': ['interpolate',['linear'],
        //                  ['get', 'mag'],0,0,6,1],
        // Increase the heatmap color weight weight by zoom level
        // heatmap-intensity is a multiplier on top of heatmap-weight
        //'heatmap-intensity': ['interpolate',['linear'],
        //                     ['zoom'],0,1,9,3],

        // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
        // Begin color ramp at 0-stop with a 0-transparancy color
        // to create a blur-like effect.
        'heatmap-color': ['interpolate',['linear'],
                         ['heatmap-density'],
                          0,'rgba(33,102,172,0)',
                        0.2,'rgb(103,169,207)',
                        0.4,'rgb(209,229,240)',
                        0.6,'rgb(253,219,199)',
                        0.8,'rgb(239,138,98)',
                        1,'rgb(178,24,43)'],
        // Adjust the heatmap radius by zoom level
        //'heatmap-radius': ['interpolate',['linear'],
        //                  ['zoom'],0,2,9,20],
        // Transition from heatmap to circle layer by zoom level
        'heatmap-opacity': ['interpolate',['linear'],
                           ['zoom'],10,0.8,20,0.2]
            }
        },
        //'waterway-label'
        );
    
    map.on("click",idBase +"&markers", (event) => {
            var coordinates = event.features[0].geometry.coordinates.slice();
            var name = event.features[0].properties.name;
            var address = event.features[0].properties.address;
            var tel = event.features[0].properties.tel;            
            
            while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
                }
        
            var googleSearchURL = new URL("https://google.com/search")
            googleSearchURL.search = new URLSearchParams({q : name + " " + address})
            var info = $("<div>").append($("<a>").attr({href : googleSearchURL.toString(),target: '_blank'})
                        .append($("<h5>").text(name)))
                        .append($("<ul>")
                        .append($("<li>").text(address))
                        .append($("<li>").text(tel))
                        ).append($('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script><ins class="adsbygoogle" style="display:block" data-ad-format="fluid" data-ad-layout-key="-hy-3+1f-3d+2z" data-ad-client="ca-pub-1273466083793643" data-ad-slot="6313164976"></ins><script> (adsbygoogle = window.adsbygoogle || []).push({});</script>')).html();

            new mapboxgl.Popup({maxWidth:320})
                .setLngLat(coordinates)
                .setHTML(info)
                .addTo(map)
    })


    //レイヤ選択メニュー
    layerIDs.push(idBase)

    //layerIDs.forEach(el => {
        var id = idBase;

        // Add checkbox and label elements for the layer.
        var circleMenuDiv = document.createElement("div"); 
        var circleOnOff = document.createElement('input');
        circleOnOff.type = 'checkbox';
        circleOnOff.id = idBase + "&circles";
        circleOnOff.checked = true;
        var labelCircleOnOff = document.createElement('label');
        labelCircleOnOff.setAttribute('for',idBase + "&circles");
        labelCircleOnOff.textContent = "円の表示";

        var HeatMapMenuDiv = document.createElement("div"); 
        var heatMapOnOff = document.createElement('input');
        heatMapOnOff.type = 'checkbox';
        heatMapOnOff.id = idBase +"&heatmap";
        heatMapOnOff.checked = true;
        var labelheatMapOnOff = document.createElement('label');
        labelheatMapOnOff.setAttribute('for', idBase +"&heatmap");
        labelheatMapOnOff.textContent = "ヒートマップの表示";

        heatMapOnOff.addEventListener("change" , () => {
            if(this.checked){}
            else {}
       }) 
        
        circleMenuDiv.appendChild(circleOnOff);
        circleMenuDiv.appendChild(labelCircleOnOff);
        HeatMapMenuDiv.appendChild(heatMapOnOff);
        HeatMapMenuDiv.appendChild(labelheatMapOnOff);

        circleOnOff.addEventListener("change" , (event) => {
            var visibility = map.getLayoutProperty(event.currentTarget.id, 'visibility');
            if(event.currentTarget.checked == true && event.currentTarget.parentElement.parentElement.className == "active" && visibility == 'none'){
                map.setLayoutProperty(event.currentTarget.id, 'visibility', 'visible') 
            }
            else {
                map.setLayoutProperty(event.currentTarget.id, 'visibility', 'none')
            }
       })
       
        heatMapOnOff.addEventListener("change" , (event) => {
            var visibility = map.getLayoutProperty(event.currentTarget.id, 'visibility');
            if(event.currentTarget.checked == true && event.currentTarget.parentElement.parentElement.className == "active" && visibility == 'none'){
                map.setLayoutProperty(event.currentTarget.id, 'visibility', 'visible') 
            }
            else {
                map.setLayoutProperty(event.currentTarget.id, 'visibility', 'none')
            }
      }) 

        var linkdiv = document.createElement('div');
        var link = document.createElement('a');
        //var style = document.createElement('style');
        //style.appendChild(document.createTextNode(css));
        //document.getElementsByTagName('head')[0].appendChild(style);

        link.href = '#';
        link.className = 'active';
        linkdiv.className = link.className;
        link.textContent = idBase.split(" @")[0];
        link.id = idBase;
        link.style.background = result.features[0].properties["marker-color"]

        link.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if(this.className == "active"){
                map.getStyle().layers.forEach(el => {
                    if(el.id.includes(e.currentTarget.id)){
                        map.setLayoutProperty(el.id, 'visibility', 'none');
                }})
                    this.className = '';
                    this.style.background = "#f8f8f8"
                    circleOnOff.checked = false;
                    heatMapOnOff.checked = false;
            } else {
                map.getStyle().layers.forEach(el => {
                    if(el.id.includes(e.currentTarget.id)){
                        map.setLayoutProperty(el.id, 'visibility', 'visible');
                        this.style.background = map.getSource(el.source)._data.features[0].properties["marker-color"];

                }})
                    this.className = 'active';
                    circleOnOff.checked = true;
                    heatMapOnOff.checked = true;
                    }
                }

        //this.parentElement.className = this.className;
        var layers = document.getElementById('menu');
        linkdiv.appendChild(link)
        linkdiv.appendChild(circleMenuDiv);
        linkdiv.appendChild(HeatMapMenuDiv); 
        layers.appendChild(linkdiv);

    //});

    // Change the cursor to a pointer when the mouse is over the places layer.
    map.on('mouseenter', idBase +"&markers", function() {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change it back to a pointer when it leaves.
    map.on('mouseleave', idBase +"&markers", function() {
        map.getCanvas().style.cursor = '';
    });

    map.on('zoom', function() {
        console.log(map.getZoom());
    });
};



const getEntireJsonResultsList = async (url,searchParam) => {
    //初回APIリクエスト
    var apiResult = await $.getJSON(url,searchParam,data => {console.log(data)});
    var results = apiResult["Feature"]
    //応答によって処理を切り替え
    var n = parseInt(apiResult["ResultInfo"].Total / searchParam.results)
    if(n >= 4){n = 4};
    for(let i = 1; i <= n;i++){
        searchParam.start = i * searchParam.results;
        await $.getJSON(url,searchParam,data => {
            console.log(data);
            results = results.concat(data["Feature"])
        });
    }
    //return results;
    //結果取得後の処理
    var featuresJSON = results.reduce((features,el) => {
        let keyWord = ""
        
        switch(searchParam.gc.length){
            case 2 : keyWord = genre1Set[searchParam.gc];break; 
            case 4 : keyWord = genre2Set[searchParam.gc];break;
            case 7 : keyWord = genre3Set[searchParam.gc];break;
            default :  break;
        }

        keyWord += " " + searchParam.query + " "; 

        if(keyWord == "  "){keyWord = "未選択 "}

        var feature = {
            "type" : "Feature",
            "geometry" : {
                "type"        : "Point",
                "coordinates" : [parseFloat(el.Geometry.Coordinates.split(",")[0]),parseFloat(el.Geometry.Coordinates.split(",")[1])]
            },
            "properties" : {
                "name"      : el.Name,
                "id"        : parseInt(el.Id),
                "gid"       : el.Gid,
                "address"   : el.Property.Address,
                "tel"       : el.Property.Tel1,
                "genre"     : el.Property.Genre,
                "title"     : el.Name,
                "description": el.Property.Genre.Name,
                "marker-color": pickr.getColor().toHEXA().toString(),
                "query" : searchParam.query,
                "genreCode" : searchParam.gc,
                "keyWord" : keyWord,
                "baseCoordinates" : [searchParam.lon,searchParam.lat]
            }
        }
        if(!Object.values(features).includes(el.Gid)){
            features.push(feature)
        }
        return features;
        },[])

    var resultsGeoJSON = {
        "type" : "FeatureCollection",
        "features" : featuresJSON
    }   

    return resultsGeoJSON;

};

let clearAll = () => {
    location.reload();
}


$('#btnDownload').click(function() {
    if(map.getStyle().layers.slice(-1)[0].id.includes(" @")){
        this.download = "SoconimarMap" + map.getStyle().layers.slice(-1)[0].id.split(" @")[0] + ".png"
    }
    else{
        this.download = "SoconimarMap.png" 
    }
    var img = map.getCanvas().toDataURL('image/png')
    this.href = img
})


//カラーピッカー
// Simple example, see optional options for more configuration.
const pickr = Pickr.create({
    el: '.color-picker',
    theme: 'nano', // or 'monolith', or 'nano'
    default: '#0b1644',
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
        comparison: false,

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

const metersToPixelsAtMaxZoom = (meters, latitude) =>
  meters / 0.075 / Math.cos(latitude * Math.PI / 180)
