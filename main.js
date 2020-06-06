var map;
var placeList = [];
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
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 13,
        center: latLng
    });
}

function buttonClickHandler() {
    //エラーハンドリングも実装する。
    placeList = [];
    // 表示しているマーカーを消す
    for(var i = 0; i<searchedPlaceMarkers.length; i++)
    {
        searchedPlaceMarkers[i].setMap(null);
    }
    searchedPlaceMarkers = [];
   
    var latLngBounds = map.getBounds();
    var keyword = document.getElementById("placeToSearch").value;
        radius = document.getElementById("raduisToDraw").value * 1000; //ToDo km,m変換に対応する
    searchPlaces(latLngBounds,keyword)
}

function searchPlaces(latLngBounds, keyword,language) {
    var requst = 
    {
        bounds: latLngBounds,
        query: keyword,
        language: language
        //radius: '50000'
    };
    service = new google.maps.places.PlacesService(map);
    service.textSearch(requst, callback)
}

function callback(results, status, pagination)
{
    if(status == google.maps.places.PlacesServiceStatus.OK)
    {
        for(var i=0; i<results.length; i++)
        {
            var info = {
                name: results[i].name,                          // 店名
                location: results[i].geometry.location,         // 座標
                formatted_address: results[i].formatted_address,//可読な住所
                vicinity: results[i].vicinity,                  // 住所(simplified address for the place)
                address_component: results[i].address_component,  // 住所の構成要素の配列(?)
                adr_address: results[i].adr_address,            //短縮した住所(?)
            };
            placeList.push(info);
        }
        if(pagination.hasNextPage)
        {
            pagination.nextPage();
        }
        else
        {
            //OutputResults();
            initListOfTasks();
        }
    }
    else
    {
        placeList = [];
        //OutputResults();
    }
}

function OutputResults()
{
    var table = document.getElementById("results");
    while(table.firstChild)
    {
        table.removeChild(table.firstChild);
    }

    for(var i=0; i<placeList.length; i++)
    {
        var tr = document.createElement("tr");
        for(var j=0; j<3; j++)
        {
            var td = document.createElement("td");
            if(j==0)
            {
                var aTag = document.createElement("a");
                aTag.href = "javascript:void(0);";
                aTag.textContent = placeList[i].name;
                aTag.id = i;
                aTag.onclick = linkHandler;
                td.appendChild(aTag);
            }
            else if(j==1)
            {
                td.textContent = placeList[i].rating;
            }
            else if(j==2)
            {
                td.textContent = placeList[i].vicinity;
            }
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
}


function linkHandler(event)
{
    var shop = placeList[event.target.id];
    var option = {
        position: shop.location,
        title: shop.name
    };

    // 表示しているマーカーを消す
    for(var i = 0; i<searchedPlaceMarkers.length; i++)
    {
        searchedPlaceMarkers[i].setMap(null);
    }
    searchedPlaceMarkers = [];

    var contentStr = "<h1><a href=\"https://www.google.com/search?q=" + shop.name + "\" target=\"_blank\">" + shop.name + "</a></h1><div>評価：" + shop.rating + "</div><div>" + shop.vicinity + "</div>";
    var infoWindow = new google.maps.InfoWindow({
        content: contentStr
    });
    var marker = new google.maps.Marker(option);
    marker.addListener("click", function(){
        infoWindow.open(map, marker);
    })
    marker.setMap(map);
    searchedPlaceMarkers.push(marker);
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
            map.panTo(pos);

            currentPositionMarker = new MarkerWithLabel({
                map: map,
                position: pos,
                icon: {
                    url:'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                    scaledSize : new google.maps.Size(32, 32)
                },
                labelContent: "現在地",                         //ラベル文字
                labelAnchor: new google.maps.Point(-10, 25),   //ラベル文字の基点
                labelClass: 'mapLabels',                       //CSSのクラス名
                labelStyle: {opacity: 0.8},                    //透過度
                animation: google.maps.Animation.DROP,
            });

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


//検索結果よりカードを生成
let cardContainer;

let createTaskCard = (element) => {

let card = document.createElement('div');
card.className = 'card shadow cursor-pointer';

let cardBody = document.createElement('div');
cardBody.className = 'card-body';

let title = document.createElement('h5');
title.innerText = element.name;
title.className = 'card-title';

let color = document.createElement('div');
color.innerText = element.formatted_address;
color.className = 'card-color';

cardBody.appendChild(title);
cardBody.appendChild(color);
card.appendChild(cardBody);
cardContainer.appendChild(card);

}

let addMarkerPlaces = (element) => {
    var marker = new MarkerWithLabel({
        map: map,
        position: element.location,
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

let addCercleAroundPlaces = (element) => {
    var circle = new google.maps.Circle({
        map: map,
        center: element.location,
        radius : radius
    });
    searchedPlaceCircles.push(circle)
}



let initListOfTasks = () => {
if (cardContainer) {
    document.getElementById('card-container').replaceWith(cardContainer);
    return;
}

cardContainer = document.getElementById('card-container');
placeList.forEach((element) => {
    createTaskCard(element);
    addMarkerPlaces(element);
    addCercleAroundPlaces(element);
});
};