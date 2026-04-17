
try {

var B=[
];

function rd(x,y){
  var dX=(x-155000)*1e-5, dY=(y-463000)*1e-5;
  var dX2=dX*dX,dY2=dY*dY,dX3=dX2*dX,dY3=dY2*dY,dX4=dX3*dX,dY4=dY3*dY;
  var sN=3235.65389*dY -32.58297*dX2 -0.2475*dY2 -0.84978*dX2*dY -0.0655*dY3
    -0.01709*dX2*dY2 -0.00738*dX +0.0053*dX4 -0.00039*dY4 +0.00033*dX2*dY3 -0.00012*dX*dY;
  var sE=5260.52916*dX +105.94684*dX*dY +2.45656*dX*dY2 -0.81885*dX3 +0.05594*dX*dY3
    -0.05607*dX3*dY +0.01199*dY -0.00256*dX3*dY2 +0.00128*dX*dY4 +0.00022*dY2 -0.00022*dX2 +0.00026*dX4*dX;
  return[52.15517440+sN/3600, 5.38720621+sE/3600];
}
// Dynamische kleurenschaal op basis van data
var colorScale={min:0,max:100,ranges:[]};
var COLORS=['#6a1b9a','#1565c0','#2e7d32','#e65100','#c62828'];

function buildColorScale(){
  var depths=data.map(function(d){return d.d;}).filter(function(d){return d>0;});
  if(depths.length===0){colorScale.ranges=[];updateLegend();return;}
  var mn=Math.min.apply(null,depths);
  var mx=Math.max.apply(null,depths);
  colorScale.min=mn;colorScale.max=mx;
  // Maak 5 gelijke bereiken
  var span=mx-mn;
  if(span<1){
    // Alle dezelfde diepte
    colorScale.ranges=[{from:mn,to:mx,color:COLORS[2]}];
  } else {
    var step=span/5;
    colorScale.ranges=[];
    for(var ci=0;ci<5;ci++){
      var from=mn+ci*step;
      var to=(ci===4)?mx:mn+(ci+1)*step;
      colorScale.ranges.push({from:Math.round(from*10)/10,to:Math.round(to*10)/10,color:COLORS[ci]});
    }
  }
  updateLegend();
}

function cc(d){
  if(d===0||d===undefined||d===null) return '#9e9e9e'; // Grijs voor onbekende diepte
  if(colorScale.ranges.length===0) return '#2e7d32';
  for(var ci=0;ci<colorScale.ranges.length;ci++){
    if(d<=colorScale.ranges[ci].to) return colorScale.ranges[ci].color;
  }
  return COLORS[COLORS.length-1];
}

function updateLegend(){
  var el=document.getElementById('legend');
  if(!el) return;
  if(colorScale.ranges.length===0){el.innerHTML='<b>Geen data</b>';return;}
  var h='<b>Diepte:</b> ';
  colorScale.ranges.forEach(function(r,i){
    var label;
    if(colorScale.ranges.length===1){
      label=r.from+'m';
    } else if(i===colorScale.ranges.length-1){
      label='≥'+r.from+'m';
    } else {
      label=r.from+'-'+r.to+'m';
    }
    h+='<span><i class="d" style="background:'+r.color+'"></i>'+label+'</span> ';
  });
  // Toon "onbekend" als er punten met diepte 0 zijn
  var hasZero=data.some(function(d){return d.d===0;});
  if(hasZero) h+='<span><i class="d" style="background:#9e9e9e"></i>onbekend</span> ';
  h+='&nbsp;|&nbsp; <b>Grootte:</b> schaalt met diameter';
  el.innerHTML=h;
}

// WGS84 to RD (inverse) — Benaderingsformules Schreutelkamp & Strang van Hees
function wgs2rd(lat,lng){
  var dP=0.36*(lat-52.15517440);
  var dL=0.36*(lng-5.38720621);
  var dP2=dP*dP,dP3=dP2*dP,dL2=dL*dL,dL3=dL2*dL,dL4=dL3*dL;
  var x=155000
    +190094.945*dL
    -11832.228*dP*dL
    -114.221*dP2*dL
    -32.391*dL3
    -0.705*dP
    -2.340*dP3*dL
    -0.608*dP*dL3
    -0.008*dL2
    +0.148*dP2*dL3;
  var y=463000
    +309056.544*dP
    +3638.893*dL2
    +73.077*dP2
    -157.984*dP*dL2
    +59.788*dP3
    +0.433*dL
    -6.439*dP2*dL2
    -0.032*dP*dL
    +0.092*dL4
    -0.054*dP*dL4;
  return[Math.round(x),Math.round(y)];
}

var data=B.map(function(r){var ll=rd(r[1],r[2]);return{n:r[0],x:r[1],y:r[2],d:r[3],dia:r[4],lat:ll[0],lng:ll[1]};});
var tot=data.reduce(function(s,d){return s+d.d;},0);

buildColorScale();

if(data.length>0){
  document.getElementById('info').innerHTML='<span><b>'+data.length+'</b> boringen</span><span><b>'+tot.toLocaleString('nl-NL')+'</b> boormeters</span><span>Gem: <b>'+Math.round(tot/data.length)+'m</b></span>';
} else {
  document.getElementById('info').innerHTML='<span>Geen boorpunten — importeer via CSV/Excel of voeg handmatig toe</span>';
}

// Status
var st=document.getElementById('status');
st.style.display='block';
st.textContent='Kaart laden...';

if(typeof L==='undefined'){
  st.textContent='FOUT: Leaflet bibliotheek niet geladen. Check internetverbinding.';
  throw new Error('No Leaflet');
}

// Tile layers - meerdere opties
var tiles={
  sat:L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{subdomains:'0123',maxZoom:21,attribution:'Google'}),
  hyb:L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',{subdomains:'0123',maxZoom:21,attribution:'Google'}),
  map:L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{subdomains:'0123',maxZoom:21,attribution:'Google'}),
  osm:L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'OSM'}),
  // PDOK luchtfoto actueel (HR = 7.5cm resolutie, scherp)
  pdoklucht:L.tileLayer('https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg',{maxZoom:21,attribution:'PDOK Luchtfoto HR'}),
  // PDOK BRT Achtergrondkaart (topografisch)
  pdoktopo:L.tileLayer('https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png',{maxZoom:19,attribution:'PDOK BRT'}),
  // PDOK Kadastrale kaart (perceelsgrenzen)
  pdokkad:L.tileLayer('https://service.pdok.nl/kadaster/kadastralekaart/wmts/v5_0/Kadastralekaart/EPSG:3857/{z}/{x}/{y}.png',{maxZoom:19,attribution:'PDOK Kadaster'})
};

// Bereken center alvast — default Nederland midden als geen data
var cLat=data.length>0?data.reduce(function(s,d){return s+d.lat;},0)/data.length:52.3;
var cLng=data.length>0?data.reduce(function(s,d){return s+d.lng;},0)/data.length:4.9;
var defZoom=data.length>0?15:8;

// Prevent re-init if already exists (tab switch)
if(window.__boorpuntMap) { console.log('Boorpunt: map already loaded, skipping init'); throw {__skip:true}; }
var map=L.map('map',{center:[cLat,cLng],zoom:defZoom});
window.__boorpuntMap=map;

var cur=tiles.sat, curKey='sat';
cur.addTo(map);

// Check of tiles laden
cur.on('tileerror',function(){
  st.textContent='Satelliet tiles laden niet — probeer een andere laag (OSM/Kaart)';
  st.style.background='#ffebee';st.style.color='#c62828';
});
cur.on('load',function(){
  st.style.display='none';
});

// Na 3 sec check
setTimeout(function(){
  if(st.style.display!=='none'){
    st.textContent='Tiles laden traag... Probeer OSM knop als satelliet niet werkt.';
  }
},3000);

var ms=[],ls=[],lv=true;

function esc(v){
  return String(v===undefined||v===null?'':v)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function isPeilbuisType(b){
  var t=(b&&b.type?String(b.type):'').toLowerCase();
  return t==='pb'||t==='peilbuis'||t==='monitoring';
}

function getPointRadius(b){
  if(isPeilbuisType(b)) return 5;
  if(b.dia>42) return 8;
  return b.dia>0?6:5;
}

function getPointWeight(b){
  if(isPeilbuisType(b)) return 2;
  return b.dia>42?2.5:1.5;
}

function getPointStrokeColor(b){
  return isPeilbuisType(b)?'#000':'#fff';
}

function getPointFillColor(b){
  return isPeilbuisType(b)?'#ff6f00':cc(b.d);
}

function getPointLabelColor(b){
  return b.labelColor||(b.csv?'#0ff':b.custom?'#ff0':'#fff');
}

function getPointLabelHtml(b){
  return '<div style="font-size:8px;font-weight:700;color:'+getPointLabelColor(b)+';text-shadow:1px 1px 1px #000,-1px -1px 1px #000;transform:translate(-50%,-16px);text-align:center;white-space:nowrap">'+esc(b.n)+'</div>';
}

function getPointPopupHtml(b){
  var idx=data.indexOf(b);
  var diaValue=b.dia>0?b.dia:'';
  var diepteValue=b.d>0?b.d:'';
  var diaLabel=b.dia>0?('⌀'+b.dia+'mm'):'⌀ onbekend';
  var diepteLabel=b.d>0?(b.d+'m'):'diepte onbekend';
  var typeLabel=b.type?(' ['+esc(b.type)+']'):'';
  return '<div style="min-width:185px">'
    +'<div style="font-weight:700;margin-bottom:4px">'+esc(b.n)+typeLabel+'</div>'
    +'<div style="font-size:11px;color:#555;margin-bottom:6px">'+diepteLabel+' | '+diaLabel+'<br>RD: '+b.x+', '+b.y+'</div>'
    +'<div style="display:grid;grid-template-columns:52px 1fr;gap:4px;align-items:center;font-size:11px">'
    +'<span>Nr</span><input id="editName_'+idx+'" value="'+esc(b.n)+'" style="padding:3px 5px;border:1px solid #bbb;border-radius:4px;font-size:11px">'
    +'<span>Diepte</span><input id="editDepth_'+idx+'" type="number" min="0" step="0.1" value="'+diepteValue+'" style="padding:3px 5px;border:1px solid #bbb;border-radius:4px;font-size:11px">'
    +'<span>⌀ mm</span><input id="editDia_'+idx+'" type="number" min="0" step="0.1" value="'+diaValue+'" style="padding:3px 5px;border:1px solid #bbb;border-radius:4px;font-size:11px">'
    +'</div>'
    +'<div style="margin-top:7px;display:flex;gap:6px">'
    +'<button onclick="savePointEdit('+idx+')" style="padding:4px 10px;background:#1e3a5f;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer">Opslaan</button>'
    +'<button onclick="closePointEdit()" style="padding:4px 10px;background:#eee;color:#333;border:none;border-radius:4px;font-size:11px;cursor:pointer">Sluiten</button>'
    +'</div>'
    +'</div>';
}

function attachPointLayers(b,labelColor){
  if(labelColor) b.labelColor=labelColor;
  var m=L.circleMarker([b.lat,b.lng],{
    radius:getPointRadius(b), fillColor:getPointFillColor(b), color:getPointStrokeColor(b),
    weight:getPointWeight(b), fillOpacity:0.9
  }).addTo(map);
  m.bindPopup(getPointPopupHtml(b));
  ms.push(m);
  b._marker=m;

  var lb=L.marker([b.lat,b.lng],{icon:L.divIcon({
    className:'',iconSize:[0,0],
    html:getPointLabelHtml(b)
  })}).addTo(map);
  ls.push(lb);
  b._label=lb;
}

function refreshPointLayers(b){
  if(b._marker&&b._marker.setStyle){
    b._marker.setStyle({
      radius:getPointRadius(b),
      fillColor:getPointFillColor(b),
      color:getPointStrokeColor(b),
      weight:getPointWeight(b),
      fillOpacity:0.9
    });
    b._marker.setPopupContent(getPointPopupHtml(b));
  }
  if(b._label&&b._label.setIcon){
    b._label.setIcon(L.divIcon({className:'',iconSize:[0,0],html:getPointLabelHtml(b)}));
  }
}

function refreshPointDataViews(){
  buildColorScale();
  data.forEach(function(item){refreshPointLayers(item);});
  grp=L.featureGroup(ms);
  refreshTable();
  tot=data.reduce(function(s,d){return s+d.d;},0);
  if(data.length>0){
    document.getElementById('info').innerHTML='<span><b>'+data.length+'</b> boringen</span><span><b>'+tot.toLocaleString('nl-NL')+'</b> boormeters</span><span>Gem: <b>'+Math.round(tot/data.length)+'m</b></span>';
  } else {
    document.getElementById('info').innerHTML='<span><b>0</b> boringen</span><span><b>0</b> boormeters</span>';
  }
}

data.forEach(function(b){
  attachPointLayers(b,'#fff');
});

var grp=L.featureGroup(ms);
if(ms.length>0) map.fitBounds(grp.getBounds().pad(0.12));

window.sw=function(k,btn){
  map.removeLayer(cur);
  if(cur._events && cur._events.tileerror) cur.off('tileerror');
  curKey=k;cur=tiles[k];cur.addTo(map);
  cur.on('tileerror',function(){st.style.display='block';st.textContent='Deze tiles laden niet — probeer andere laag';});
  cur.on('load',function(){st.style.display='none';});
  document.querySelectorAll('.ctrl button').forEach(function(b){b.classList.remove('on');});
  btn.classList.add('on');
};
window.tl=function(){lv=!lv;ls.forEach(function(l){if(lv)l.addTo(map);else map.removeLayer(l);});};
window.za=function(){if(ms.length>0) map.fitBounds(grp.getBounds().pad(0.12));};

// === PUNT TOEVOEGEN ===
var addMode=false;
var addedPoints=[]; // track added points for undo

window.toggleAdd=function(){
  addMode=!addMode;
  var btn=document.getElementById('addBtn');
  var panel=document.getElementById('addPanel');
  if(addMode){
    btn.style.background='#1b5e20';btn.textContent='✓ Plaatsen...';
    panel.style.display='block';
    map.getContainer().style.cursor='crosshair';
    // Auto-increment name
    var maxNum=0;
    data.forEach(function(d){var m=d.n.match(/\d+/);if(m)maxNum=Math.max(maxNum,parseInt(m[0]));});
    document.getElementById('addName').value='A'+(maxNum+1).toString().padStart(3,'0');
  } else {
    btn.style.background='#2e7d32';btn.textContent='+ Punt';
    panel.style.display='none';
    map.getContainer().style.cursor='';
  }
};

map.on('click',function(e){
  if(typeof measureMode!=='undefined'&&measureMode) return;
  if(!addMode) return;
  var lat=e.latlng.lat, lng=e.latlng.lng;
  var rdCoords=wgs2rd(lat,lng);
  var naam=document.getElementById('addName').value.trim()||'Nieuw';
  var diepte=parseInt(document.getElementById('addDepth').value)||200;
  var dia=parseInt(document.getElementById('addDia').value)||40;

  var b={n:naam,x:rdCoords[0],y:rdCoords[1],d:diepte,dia:dia,lat:lat,lng:lng,custom:true};
  data.push(b);
  addedPoints.push(b);
  attachPointLayers(b,'#ff0');
  refreshPointDataViews();

  // Auto-increment name for next point
  var maxNum2=0;
  data.forEach(function(d){var m2=d.n.match(/\d+/);if(m2)maxNum2=Math.max(maxNum2,parseInt(m2[0]));});
  document.getElementById('addName').value='A'+(maxNum2+1).toString().padStart(3,'0');
});

window.undoLast=function(){
  if(addedPoints.length===0){alert('Geen punten om ongedaan te maken');return;}
  var b=addedPoints.pop();
  // Remove from data
  var idx=data.indexOf(b);
  if(idx>=0) data.splice(idx,1);
  // Remove marker & label
  if(b._marker){map.removeLayer(b._marker);var mi=ms.indexOf(b._marker);if(mi>=0)ms.splice(mi,1);}
  if(b._label){map.removeLayer(b._label);var li=ls.indexOf(b._label);if(li>=0)ls.splice(li,1);}
  refreshPointDataViews();
};

function refreshTable(){
  var h2='';data.forEach(function(b,i){
    var style=b.custom?'background:#e8f5e9;':'';
    var diaDisp=b.dia>0?b.dia:'-';
    var diepteDisp=b.d>0?(b.d+'m'):'-';
    h2+='<tr style="'+style+'"><td>'+(i+1)+'</td><td><b>'+esc(b.n)+'</b>'+(b.custom?' 🆕':'')+'</td><td>'+b.x+'</td><td>'+b.y+'</td><td style="color:'+cc(b.d)+';font-weight:600">'+diepteDisp+'</td><td>'+diaDisp+'</td></tr>';
  });
  document.getElementById('tb').innerHTML=h2;
}

window.closePointEdit=function(){
  map.closePopup();
};

window.savePointEdit=function(idx){
  var b=data[idx];
  if(!b){alert('Punt niet gevonden');return;}

  var naamEl=document.getElementById('editName_'+idx);
  var diepteEl=document.getElementById('editDepth_'+idx);
  var diaEl=document.getElementById('editDia_'+idx);
  if(!naamEl||!diepteEl||!diaEl){alert('Popup niet gevonden');return;}

  var naam=naamEl.value.trim();
  var diepteRaw=String(diepteEl.value||'').replace(',','.').trim();
  var diaRaw=String(diaEl.value||'').replace(',','.').trim();
  var diepte=diepteRaw===''?0:parseFloat(diepteRaw);
  var dia=diaRaw===''?0:parseFloat(diaRaw);

  if(!naam){alert('Vul een boornummer in');return;}
  if(isNaN(diepte)||diepte<0){alert('Vul een geldige diepte in');return;}
  if(isNaN(dia)||dia<0){alert('Vul een geldige diameter in');return;}

  b.n=naam;
  b.d=Math.round(diepte*10)/10;
  b.dia=Math.round(dia*10)/10;
  refreshPointDataViews();
  if(b._marker) b._marker.openPopup();
};

// === ADRES ZOEKEN (PDOK Locatieserver) ===
var adresMarker=null;
window.zoekAdres=function(){
  var q=document.getElementById('adresInput').value.trim();
  if(!q){alert('Vul een adres in');return;}
  var res=document.getElementById('adresResult');
  res.textContent='Zoeken...';res.style.color='#1e3a5f';
  fetch('https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q='+encodeURIComponent(q)+'&rows=1&fq=type:adres')
    .then(function(r){return r.json();})
    .then(function(j){
      if(!j.response||!j.response.docs||j.response.docs.length===0){
        // Fallback: zoek zonder type filter
        return fetch('https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q='+encodeURIComponent(q)+'&rows=1')
          .then(function(r2){return r2.json();});
      }
      return j;
    })
    .then(function(j){
      if(!j.response||!j.response.docs||j.response.docs.length===0){
        res.textContent='Niet gevonden';res.style.color='#c62828';return;
      }
      var doc=j.response.docs[0];
      var wkt=doc.centroide_ll;
      // Parse POINT(lng lat)
      var m=wkt.match(/POINT\(([^ ]+) ([^)]+)\)/);
      if(!m){res.textContent='Geen coördinaten';res.style.color='#c62828';return;}
      var lng=parseFloat(m[1]), lat=parseFloat(m[2]);
      var rdWkt=doc.centroide_rd;
      var rdM=rdWkt?rdWkt.match(/POINT\(([^ ]+) ([^)]+)\)/):null;
      var rdTxt=rdM?('RD: '+Math.round(parseFloat(rdM[1]))+', '+Math.round(parseFloat(rdM[2]))):'';

      map.setView([lat,lng],17);
      // Place/move address marker
      if(adresMarker) map.removeLayer(adresMarker);
      adresMarker=L.marker([lat,lng],{icon:L.divIcon({
        className:'',iconSize:[0,0],
        html:'<div style="font-size:20px;transform:translate(-10px,-30px)">📍</div>'
      })}).addTo(map);
      adresMarker.bindPopup('<b>'+doc.weergavenaam+'</b><br>'+rdTxt).openPopup();

      res.textContent=doc.weergavenaam+(rdTxt?' — '+rdTxt:'');res.style.color='#2e7d32';
    })
    .catch(function(err){
      res.textContent='Fout: '+err.message;res.style.color='#c62828';
    });
};
// Enter key op adresbalk
document.getElementById('adresInput').addEventListener('keydown',function(e){
  if(e.key==='Enter')zoekAdres();
});

// === ALLES WISSEN ===
window.clearAll=function(){
  if(!confirm('Alle '+data.length+' boorpunten wissen? Dit kan niet ongedaan worden.')) return;
  // Remove all markers and labels
  ms.forEach(function(m){map.removeLayer(m);});
  ls.forEach(function(l){map.removeLayer(l);});
  ms=[];ls=[];
  data.length=0;
  addedPoints.length=0;
  grp=L.featureGroup(ms);
  tot=0;
  document.getElementById('info').innerHTML='<span><b>0</b> boringen</span><span><b>0</b> boormeters</span>';
  refreshTable();
  if(adresMarker){map.removeLayer(adresMarker);adresMarker=null;}
  // Reset add name counter
  document.getElementById('addName').value='A001';
};

// Tabel
var h='';data.forEach(function(b,i){h+='<tr><td>'+(i+1)+'</td><td><b>'+b.n+'</b></td><td>'+b.x+'</td><td>'+b.y+'</td><td style="color:'+cc(b.d)+';font-weight:600">'+b.d+'m</td><td>'+b.dia+'</td></tr>';});
document.getElementById('tb').innerHTML=h;

st.textContent='Kaart geladen — wacht op tiles...';

window.exportPDF=function(){
  var btn=document.querySelector('.ctrl button[style*="c62828"]');
  btn.textContent='Tiles laden...';btn.disabled=true;

  // Helper: lat/lng to pixel at zoom z
  function ll2px(lat,lng,z){
    var n=Math.pow(2,z);
    var x=(lng+180)/360*n*256;
    var latR=lat*Math.PI/180;
    var y=(1-Math.log(Math.tan(latR)+1/Math.cos(latR))/Math.PI)/2*n*256;
    return{x:x,y:y};
  }
  // Tile index from lat/lng
  function ll2tile(lat,lng,z){
    var n=Math.pow(2,z);
    var x=Math.floor((lng+180)/360*n);
    var latR=lat*Math.PI/180;
    var y=Math.floor((1-Math.log(Math.tan(latR)+1/Math.cos(latR))/Math.PI)/2*n);
    return{x:x,y:y};
  }

  // Auto-center on borehole points with padding — always north-up
  var minLat,maxLat,minLng,maxLng,z;
  if(data.length>0){
    minLat=999;maxLat=-999;minLng=999;maxLng=-999;
    data.forEach(function(b){
      if(b.lat<minLat)minLat=b.lat;
      if(b.lat>maxLat)maxLat=b.lat;
      if(b.lng<minLng)minLng=b.lng;
      if(b.lng>maxLng)maxLng=b.lng;
    });
    // Add 15% padding around borehole extent
    var latPad=Math.max((maxLat-minLat)*0.15,0.0005);
    var lngPad=Math.max((maxLng-minLng)*0.15,0.0008);
    minLat-=latPad;maxLat+=latPad;
    minLng-=lngPad;maxLng+=lngPad;
    // Calculate optimal zoom to fit all points
    // Target canvas ~4000px wide for high-res PDF output
    var targetPxW=4000;
    for(z=19;z>=13;z--){
      var pxW=ll2px(minLat,maxLng,z).x-ll2px(minLat,minLng,z).x;
      if(pxW<=targetPxW) break;
    }
  } else {
    // Fallback: use current map view
    var bounds=map.getBounds();
    minLat=bounds.getSouth();maxLat=bounds.getNorth();
    minLng=bounds.getWest();maxLng=bounds.getEast();
    z=map.getZoom();
  }
  if(z<13)z=13; if(z>19)z=19;
  z=Math.round(z);

  // Get tile range
  var tNW=ll2tile(maxLat,minLng,z), tSE=ll2tile(minLat,maxLng,z);
  var pxNW=ll2px(maxLat,minLng,z), pxSE=ll2px(minLat,maxLng,z);
  var originX=tNW.x*256, originY=tNW.y*256;
  var baseCW=(tSE.x-tNW.x+1)*256, baseCH=(tSE.y-tNW.y+1)*256;

  // === WMS config for PDOK layers (single high-res image, QGIS/ArcGIS quality) ===
  var wmsConfig={
    pdoklucht:{url:'https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0',layer:'Actueel_orthoHR',format:'image/jpeg'},
    pdoktopo:{url:'https://service.pdok.nl/brt/achtergrondkaart/wms/v2_0',layer:'standaard',format:'image/png'},
    pdokkad:{url:'https://service.pdok.nl/kadaster/kadastralekaart/wms/v5_0',layer:'Kadastralekaart',format:'image/png'}
  };

  // For WMS: scale canvas to high resolution independent of tile grid
  var pxScale=1;
  if(wmsConfig[curKey]){
    var wmsTargetW=5000;
    if(baseCW<wmsTargetW){
      pxScale=wmsTargetW/baseCW;
    }
  }
  var cW=Math.round(baseCW*pxScale), cH=Math.round(baseCH*pxScale);

  // Create canvas
  var cvs=document.createElement('canvas');
  cvs.width=cW;cvs.height=cH;
  var ctx=cvs.getContext('2d');
  ctx.fillStyle='#e8ecf1';ctx.fillRect(0,0,cW,cH);

  if(wmsConfig[curKey]){
    // WMS approach: one single high-resolution image
    var wms=wmsConfig[curKey];
    btn.textContent='WMS kaart laden (hoge resolutie)...';

    // Convert tile-aligned bounds to EPSG:3857 bbox
    var nTiles=Math.pow(2,z);
    var fullExt=40075016.68, halfExt=20037508.34;
    var bboxMinX=tNW.x/nTiles*fullExt-halfExt;
    var bboxMaxX=(tSE.x+1)/nTiles*fullExt-halfExt;
    var bboxMaxY=halfExt-tNW.y/nTiles*fullExt;
    var bboxMinY=halfExt-(tSE.y+1)/nTiles*fullExt;

    var wmsUrl=wms.url+'?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap'+
      '&LAYERS='+encodeURIComponent(wms.layer)+
      '&CRS=EPSG:3857'+
      '&BBOX='+bboxMinX+','+bboxMinY+','+bboxMaxX+','+bboxMaxY+
      '&WIDTH='+cW+'&HEIGHT='+cH+
      '&FORMAT='+encodeURIComponent(wms.format)+
      '&STYLES=';

    var wmsImg=new Image();
    wmsImg.crossOrigin='anonymous';
    wmsImg.onload=function(){
      ctx.drawImage(wmsImg,0,0,cW,cH);
      btn.textContent='PDF maken...';
      finishPDF();
    };
    wmsImg.onerror=function(){
      // Fallback to tiles if WMS fails — reset to tile dimensions
      btn.textContent='WMS mislukt, tiles laden...';
      pxScale=1; cW=baseCW; cH=baseCH;
      cvs.width=cW; cvs.height=cH;
      ctx.fillStyle='#e8ecf1'; ctx.fillRect(0,0,cW,cH);
      loadTilesAndFinish();
    };
    wmsImg.src=wmsUrl;
  } else {
    // Tile approach for non-PDOK layers
    loadTilesAndFinish();
  }

  function loadTilesAndFinish(){
    var tileUrls={
      sat:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      hyb:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      map:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      osm:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      pdoklucht:'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg',
      pdoktopo:'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png',
      pdokkad:'https://service.pdok.nl/kadaster/kadastralekaart/wmts/v5_0/Kadastralekaart/EPSG:3857/{z}/{x}/{y}.png'
    };
    var pdfTileUrl=tileUrls[curKey]||tileUrls.sat;
    var totalT=(tSE.x-tNW.x+1)*(tSE.y-tNW.y+1);
    var loadedT=0;

    btn.textContent='Tiles 0/'+totalT+'...';

    for(var ttx=tNW.x;ttx<=tSE.x;ttx++){
      for(var tty=tNW.y;tty<=tSE.y;tty++){
        (function(ttx,tty){
          var img=new Image();
          img.crossOrigin='anonymous';
          img.onload=function(){
            ctx.drawImage(img,(ttx-tNW.x)*256,(tty-tNW.y)*256,256,256);
            loadedT++;btn.textContent='Tiles '+loadedT+'/'+totalT+'...';
            if(loadedT===totalT)finishPDF();
          };
          img.onerror=function(){
            loadedT++;
            if(loadedT===totalT)finishPDF();
          };
          var subs=['a','b','c'];
          img.src=pdfTileUrl.replace('{z}',z).replace('{y}',tty).replace('{x}',ttx).replace('{s}',subs[(ttx+tty)%3]);
        })(ttx,tty);
      }
    }
  }

  function finishPDF(){
    btn.textContent='PDF maken...';

    // === Draw KLIC layers on canvas ===
    // Helper: lat/lng to canvas pixel (scaled for WMS)
    function ll2cvs(lat,lng){
      var px=ll2px(lat,lng,z);
      return{x:(px.x-originX)*pxScale,y:(px.y-originY)*pxScale};
    }

    // Draw KLIC PNG overlays
    var klicImgPromises=[];
    klicLayers.forEach(function(kl){
      kl.layers.forEach(function(layer){
        if(layer.type==='png'&&layer.overlay&&map.hasLayer(layer.overlay)){
          var bounds=layer.overlay.getBounds();
          var sw=ll2cvs(bounds.getSouth(),bounds.getWest());
          var ne=ll2cvs(bounds.getNorth(),bounds.getEast());
          var imgUrl=layer.overlay._url||layer.overlay._image?.src;
          if(imgUrl){
            klicImgPromises.push(new Promise(function(resolve){
              var img=new Image();
              img.crossOrigin='anonymous';
              img.onload=function(){
                var dx=Math.min(sw.x,ne.x);
                var dy=Math.min(sw.y,ne.y);
                var dw=Math.abs(ne.x-sw.x);
                var dh=Math.abs(ne.y-sw.y);
                ctx.globalAlpha=0.7;
                ctx.drawImage(img,dx,dy,dw,dh);
                ctx.globalAlpha=1.0;
                resolve();
              };
              img.onerror=function(){resolve();};
              img.src=imgUrl;
            }));
          }
        }
      });
    });

    // Draw KLIC vector layers (polygons + lines)
    function drawKlicVectors(){
      klicLayers.forEach(function(kl){
        kl.layers.forEach(function(layer){
          if(!layer.overlay||!map.hasLayer(layer.overlay)) return;

          if(layer.type==='polygon'&&layer.overlay.getLatLngs){
            var rings=layer.overlay.getLatLngs();
            var outerRing=rings[0]||rings;
            if(Array.isArray(outerRing[0])) outerRing=outerRing[0]; // nested
            if(outerRing.length>=3){
              ctx.beginPath();
              outerRing.forEach(function(ll,i){
                var p=ll2cvs(ll.lat,ll.lng);
                if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
              });
              ctx.closePath();
              ctx.strokeStyle=layer.color||'#ff6f00';
              ctx.lineWidth=Math.max(2,2*pxScale);
              ctx.setLineDash([8*pxScale,4*pxScale]);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.fillStyle=(layer.color||'#ff6f00')+'20';
              ctx.fill();
            }
          }

          if(layer.type==='line'&&layer.overlay.getLatLngs){
            ctx.strokeStyle=layer.color||'#666';
            ctx.lineWidth=Math.max(2,2*pxScale);
            ctx.globalAlpha=0.85;
            var allLines=layer.overlay.getLatLngs();
            allLines.forEach(function(segment){
              if(!Array.isArray(segment)||segment.length<2) return;
              // Could be nested array
              var pts=segment[0]&&segment[0].lat!==undefined?segment:segment[0];
              if(!Array.isArray(pts)) return;
              ctx.beginPath();
              pts.forEach(function(ll,i){
                if(!ll||ll.lat===undefined) return;
                var p=ll2cvs(ll.lat,ll.lng);
                if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
              });
              ctx.stroke();
            });
            ctx.globalAlpha=1.0;
          }
        });
      });
    }

    // Wait for KLIC images, then draw vectors, then markers
    Promise.all(klicImgPromises).then(function(){
      drawKlicVectors();
      continueFinishPDF();
    });
  }

  function continueFinishPDF(){
    // Helper: lat/lng to canvas pixel (re-define for this scope, scaled for WMS)
    function ll2cvs(lat,lng){
      var px=ll2px(lat,lng,z);
      return{x:(px.x-originX)*pxScale,y:(px.y-originY)*pxScale};
    }

    // Filter: only boreholes visible in current view
    var visible=data.filter(function(b){
      var px=ll2px(b.lat,b.lng,z);
      var cx=(px.x-originX)*pxScale, cy=(px.y-originY)*pxScale;
      return cx>=0 && cx<=cW && cy>=0 && cy<=cH;
    });
    var visTot=visible.reduce(function(s,d){return s+d.d;},0);

    // Crosshair markers + colored labels with background box
    // Scale marker size relative to canvas (target ~4000px canvas, markers ~6px cross, ~14px font)
    var scaleFactor=Math.max(1,cW/2000);
    var dotRadius=Math.round(5*scaleFactor);
    var labelFontSize=Math.round(10*scaleFactor);

    // Draw dot markers on canvas
    visible.forEach(function(b){
      var px=ll2px(b.lat,b.lng,z);
      var cx=(px.x-originX)*pxScale, cy=(px.y-originY)*pxScale;
      var color=cc(b.d);

      // White outline circle
      ctx.beginPath();ctx.arc(cx,cy,dotRadius+Math.round(1.5*scaleFactor),0,2*Math.PI);
      ctx.fillStyle='#fff';ctx.fill();
      // Colored filled circle
      ctx.beginPath();ctx.arc(cx,cy,dotRadius,0,2*Math.PI);
      ctx.fillStyle=color;ctx.fill();
    });

    // Calculate label positions with collision avoidance
    var labels=[];
    visible.forEach(function(b){
      var px=ll2px(b.lat,b.lng,z);
      var cx=(px.x-originX)*pxScale, cy=(px.y-originY)*pxScale;
      labels.push({b:b,cx:cx,cy:cy,nameX:cx,nameY:cy-dotRadius-Math.round(6*scaleFactor)});
    });

    // Resolve overlaps: spread apart horizontally + vertically
    for(var i=0;i<labels.length;i++){
      for(var j=i+1;j<labels.length;j++){
        var a=labels[i], bL=labels[j];
        var colDist=Math.round(55*scaleFactor);
        if(Math.abs(a.cx-bL.cx)<colDist && Math.abs(a.nameY-bL.nameY)<(labelFontSize+4)){
          var spread=Math.max(Math.round(40*scaleFactor),Math.round(60*scaleFactor)-Math.abs(a.cx-bL.cx));
          a.nameX=a.cx-spread;
          bL.nameX=bL.cx+spread;
          if(Math.abs(a.nameY-bL.nameY)<(labelFontSize+4)){
            a.nameY=Math.min(a.nameY,bL.nameY)-(labelFontSize+4);
          }
        }
      }
    }

    // Draw labels + leader lines
    ctx.font='bold '+labelFontSize+'px system-ui,sans-serif';
    labels.forEach(function(lbl){
      // Leader line if label is offset from marker
      if(Math.abs(lbl.nameX-lbl.cx)>10){
        ctx.beginPath();
        ctx.moveTo(lbl.cx,lbl.cy-dotRadius);
        ctx.lineTo(lbl.nameX,lbl.nameY+4);
        ctx.strokeStyle='rgba(30,58,95,0.4)';ctx.lineWidth=Math.max(1,scaleFactor);
        ctx.stroke();
      }

      // Dark blue text, no background box
      ctx.textAlign='center';
      ctx.fillStyle='#1e3a5f';
      ctx.font='bold '+labelFontSize+'px system-ui,sans-serif';
      ctx.fillText(lbl.b.n,lbl.nameX,lbl.nameY);
    });

    // Get image
    var imgData=cvs.toDataURL('image/png');

    // Build PDF
    var jsPDF=window.jspdf.jsPDF;
    var pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    var pw=297,ph=210,mg=10;
    var nu=new Date();
    var datum=nu.getDate()+'-'+(nu.getMonth()+1)+'-'+nu.getFullYear();

    // --- PAGE 1: KAART ---
    // --- PAGE 1: KAART + RECHTER INFOPANEEL ---
    var panelW=52;
    var gap=4;
    var mapX=mg;
    var mapY=mg;
    var mapW=pw-mg-panelW-gap-mg;
    var mapH=ph-2*mg;
    var panelX=mapX+mapW+gap;
    var panelY=mg;
    var panelH=mapH;

    // Grote kaart links
    pdf.addImage(imgData,'PNG',mapX,mapY,mapW,mapH);
    pdf.setDrawColor(40,40,40);pdf.setLineWidth(0.35);
    pdf.rect(mapX,mapY,mapW,mapH,'S');

    // Rechterpaneel
    pdf.setFillColor(247,249,244);
    pdf.rect(panelX,panelY,panelW,panelH,'F');
    pdf.setDrawColor(160,170,155);pdf.setLineWidth(0.25);
    pdf.rect(panelX,panelY,panelW,panelH,'S');

    var tx=panelX+4;
    var ty=panelY+8;

    // Logo / titel
    pdf.setTextColor(90,145,56);
    pdf.setFont('helvetica','bold');pdf.setFontSize(10);
    pdf.text('Ground Research BV',tx,ty);
    ty+=4;
    pdf.setTextColor(40,40,40);
    pdf.setFont('helvetica','bold');pdf.setFontSize(8);
    pdf.text('Boorpunt Tekening',tx,ty);

    // Project info
    ty+=6;
    pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);
    pdf.setTextColor(70,70,70);
    pdf.text('Projectnr: '+(currentProjectNr||'-'),tx,ty);
    ty+=4;
    var klantTxt='Klant: '+(currentKlant||'-');
    if(klantTxt.length>45) klantTxt=klantTxt.slice(0,45)+'...';
    pdf.text(klantTxt,tx,ty);
    ty+=4;
    pdf.text('Datum: '+datum,tx,ty);

    // Schaalbalk op basis van zoom en latitude
    ty+=6;
    pdf.setFont('helvetica','bold');pdf.setTextColor(30,58,95);pdf.setFontSize(7.5);
    pdf.text('Schaal',tx,ty);
    ty+=3.5;
    var center=map.getCenter();
    var mPerPx=(156543.03*Math.cos(center.lat*Math.PI/180))/Math.pow(2,z);
    var targetPx=120;
    var targetM=mPerPx*targetPx;
    var steps=[1,2,5];
    var pow10=Math.pow(10,Math.floor(Math.log(targetM)/Math.log(10)));
    var nice=pow10;
    for(var si=0;si<steps.length;si++){
      if(steps[si]*pow10>=targetM){nice=steps[si]*pow10;break;}
    }
    var barPx=nice/mPerPx;
    var barW=Math.max(18,Math.min(38,barPx*(mapW/cW)));
    var barX=tx,barY=ty+1.5;
    pdf.setDrawColor(40,40,40);pdf.setLineWidth(0.45);
    pdf.line(barX,barY,barX+barW,barY);
    pdf.line(barX,barY-1.2,barX,barY+1.2);
    pdf.line(barX+barW/2,barY-1.2,barX+barW/2,barY+1.2);
    pdf.line(barX+barW,barY-1.2,barX+barW,barY+1.2);
    pdf.setFont('helvetica','normal');pdf.setTextColor(70,70,70);pdf.setFontSize(6.8);
    pdf.text('0',barX,barY+3.2);
    pdf.text(Math.round(nice/2)+'m',barX+barW/2,barY+3.2,{align:'center'});
    pdf.text(Math.round(nice)+'m',barX+barW,barY+3.2,{align:'right'});

    // North arrow
    ty=barY+8;
    pdf.setFont('helvetica','bold');pdf.setTextColor(30,58,95);pdf.setFontSize(7.5);
    pdf.text('Noord',tx,ty);
    var nx=tx+8, ny=ty+2;
    pdf.setDrawColor(30,30,30);pdf.setLineWidth(0.5);
    pdf.line(nx,ny+8,nx,ny-3);
    pdf.triangle(nx,ny-5,nx-2.1,ny-1.2,nx+2.1,ny-1.2,'F');
    pdf.setFontSize(9);pdf.setTextColor(30,30,30);
    pdf.text('N',nx,ny-6.5,{align:'center'});

    // Diepte legenda
    ty+=15;
    pdf.setFont('helvetica','bold');pdf.setTextColor(30,58,95);pdf.setFontSize(7.5);
    pdf.text('Diepte legenda',tx,ty);
    ty+=3.5;
    pdf.setFont('helvetica','normal');pdf.setFontSize(6.8);
    colorScale.ranges.forEach(function(r,i){
      if(ty>panelY+panelH-24) return;
      var hex=r.color;
      var c1=parseInt(hex.slice(1,3),16),c2=parseInt(hex.slice(3,5),16),c3=parseInt(hex.slice(5,7),16);
      pdf.setFillColor(c1,c2,c3);pdf.circle(tx+1.4,ty-0.7,1.2,'F');
      var label;
      if(colorScale.ranges.length===1) label=r.from+'m';
      else if(i===colorScale.ranges.length-1) label='>='+r.from+'m';
      else label=r.from+'-'+r.to+'m';
      pdf.setTextColor(70,70,70);pdf.text(label,tx+4.5,ty);
      ty+=3.3;
    });

    // KLIC legenda
    var klicLegenItems=[];
    klicLayers.forEach(function(kl){
      kl.layers.forEach(function(layer){
        if(layer.type==='line'&&layer.overlay&&map.hasLayer(layer.overlay)){
          var exists=klicLegenItems.some(function(item){return item.label===layer.name&&item.color===layer.color;});
          if(!exists) klicLegenItems.push({color:layer.color,label:layer.name});
        }
        if(layer.type==='polygon'&&layer.name==='Graafgebied'&&layer.overlay&&map.hasLayer(layer.overlay)){
          var exists2=klicLegenItems.some(function(item){return item.label==='Graafgebied';});
          if(!exists2) klicLegenItems.push({color:'#ff6f00',label:'Graafgebied',dashed:true});
        }
      });
    });

    if(ty<panelY+panelH-24){
      ty+=1;
      pdf.setFont('helvetica','bold');pdf.setTextColor(30,58,95);pdf.setFontSize(7.5);
      pdf.text('KLIC',tx,ty);
      ty+=3.5;
      pdf.setFont('helvetica','normal');pdf.setTextColor(70,70,70);pdf.setFontSize(6.5);
      klicLegenItems.forEach(function(item){
        if(ty>panelY+panelH-18) return;
        var hex=item.color;
        var c1=parseInt(hex.slice(1,3),16),c2=parseInt(hex.slice(3,5),16),c3=parseInt(hex.slice(5,7),16);
        pdf.setDrawColor(c1,c2,c3);pdf.setLineWidth(0.8);
        if(item.dashed){
          for(var di=0;di<4;di++) pdf.line(tx+di*2,ty-1,tx+di*2+1,ty-1);
        } else {
          pdf.line(tx,ty-1,tx+6,ty-1);
        }
        var lbl=item.label||'';
        if(lbl.length>24) lbl=lbl.slice(0,24)+'...';
        pdf.text(lbl,tx+8,ty);
        ty+=3;
      });
    }

    // Statistieken onderin paneel
    var avg=visible.length?Math.round(visTot/visible.length):0;
    var statsY=panelY+panelH-13;
    pdf.setDrawColor(190,200,188);pdf.setLineWidth(0.2);
    pdf.line(tx,statsY-2,panelX+panelW-4,statsY-2);
    pdf.setFont('helvetica','bold');pdf.setTextColor(30,58,95);pdf.setFontSize(7.2);
    pdf.text('Statistieken',tx,statsY);
    pdf.setFont('helvetica','normal');pdf.setTextColor(70,70,70);pdf.setFontSize(6.8);
    pdf.text('Boringen: '+visible.length+(visible.length<data.length?' / '+data.length:''),tx,statsY+3.5);
    pdf.text('Boormeters: '+visTot.toLocaleString('nl-NL')+' m',tx,statsY+7);
    pdf.text('Gem. diepte: '+avg+' m',tx,statsY+10.5);

    // Footer
    pdf.setTextColor(140,140,140);pdf.setFontSize(5.8);
    pdf.text('Ground Research BV \u2014 Vrijheidweg 45, 1521RP Wormerveer',mg,ph-2.8);

    // --- PAGE 2: TABEL ---
    pdf.addPage();
    pdf.setFillColor(30,58,95);pdf.rect(0,0,pw,14,'F');
    pdf.setTextColor(255,255,255);pdf.setFontSize(12);pdf.setFont('helvetica','bold');
    pdf.text('Boorpunten Overzicht \u2014 Tabel',mg,10);
    pdf.setFontSize(8);pdf.setFont('helvetica','normal');
    pdf.text('Ground Research BV  |  '+datum,pw-mg,10,{align:'right'});

    var tby=20;
    pdf.setFillColor(30,58,95);pdf.rect(mg,tby,pw-2*mg,5.5,'F');
    pdf.setTextColor(255,255,255);pdf.setFontSize(7.5);pdf.setFont('helvetica','bold');
    var tcols=[mg+2,mg+12,mg+35,mg+62,mg+89,mg+116];
    var thdr=['#','Nr','X (RD)','Y (RD)','Diepte','Diameter'];
    thdr.forEach(function(h,i){pdf.text(h,tcols[i],tby+4);});

    pdf.setFont('helvetica','normal');var ry=tby+5.5;
    visible.forEach(function(b,i){
      if(ry>ph-12){
        pdf.addPage();ry=mg;
        pdf.setFillColor(30,58,95);pdf.rect(mg,ry,pw-2*mg,5.5,'F');
        pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);
        thdr.forEach(function(h,j){pdf.text(h,tcols[j],ry+4);});
        pdf.setFont('helvetica','normal');ry+=5.5;
      }
      if(i%2===0){pdf.setFillColor(245,245,250);pdf.rect(mg,ry,pw-2*mg,5,'F');}
      pdf.setTextColor(60,60,60);pdf.setFontSize(7.5);
      pdf.text(''+(i+1),tcols[0],ry+3.5);
      pdf.setFont('helvetica','bold');pdf.text(b.n,tcols[1],ry+3.5);pdf.setFont('helvetica','normal');
      pdf.text(''+b.x,tcols[2],ry+3.5);pdf.text(''+b.y,tcols[3],ry+3.5);
      var dc2=cc(b.d);var r1=parseInt(dc2.slice(1,3),16),g1=parseInt(dc2.slice(3,5),16),b1=parseInt(dc2.slice(5,7),16);
      pdf.setTextColor(r1,g1,b1);pdf.setFont('helvetica','bold');pdf.text(b.d+'m',tcols[4],ry+3.5);
      pdf.setFont('helvetica','normal');pdf.setTextColor(60,60,60);pdf.text(b.dia+'mm',tcols[5],ry+3.5);
      ry+=5;
    });
    pdf.setTextColor(150,150,150);pdf.setFontSize(5.5);
    pdf.text('Ground Research BV \u2014 Vrijheidweg 45, 1521RP Wormerveer',mg,ph-3);

    // Filename based on project/client
    var pdfNr=currentProjectNr||'export';
    var pdfKlant=currentKlant||'';
    var pdfName=pdfKlant?(pdfKlant+'-'+pdfNr+'-boorpunten.pdf'):('boorpunten-'+pdfNr+'.pdf');
    pdfName=pdfName.replace(/[^a-zA-Z0-9\-_.]/g,'_');

    pdf.save(pdfName);

    // Auto-upload PDF to Dropbox if project is set
    if(currentProjectNr){
      try{
        var pdfB64=pdf.output('datauristring').split(',')[1];
        var dropPath=pdfKlant?('/Ground Research/'+pdfKlant+'/'+currentProjectNr+'/'+pdfName):('/Ground Research/'+currentProjectNr+'/'+pdfName);
        // Create folder first
        fetch('/api/dropbox/upload',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({folderPath:dropPath.substring(0,dropPath.lastIndexOf('/'))})}).then(function(){
          return fetch('/api/dropbox/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filePath:dropPath,fileContent:pdfB64,fileName:pdfName})});
        }).then(function(r){return r.json();}).then(function(res){
          if(res.success){
            var st2=document.getElementById('projectStatus');
            if(st2){st2.textContent='\u2705 PDF ook opgeslagen in Dropbox';st2.style.color='#2e7d32';}
          }
        }).catch(function(){});
      }catch(ex){}
    }

    btn.textContent='\u{1F4C4} PDF';btn.disabled=false;
  }
};

// === CSV IMPORT ===
var csvDropEl=document.getElementById('csvDrop');
var csvFileEl=document.getElementById('csvFile');
var csvStatusEl=document.getElementById('csvStatus');

window.toggleCSV=function(){
  var vis=csvDropEl.style.display==='none';
  csvDropEl.style.display=vis?'block':'none';
  var btn=document.getElementById('csvBtn');
  btn.style.background=vis?'#01579b':'#0277bd';
  btn.textContent=vis?'✕ Sluit CSV':'📂 CSV Import';
};

// Drag & drop
csvDropEl.addEventListener('dragover',function(e){e.preventDefault();csvDropEl.style.background='#dceefb';});
csvDropEl.addEventListener('dragleave',function(e){e.preventDefault();csvDropEl.style.background='#f0f4f8';});
csvDropEl.addEventListener('drop',function(e){
  e.preventDefault();csvDropEl.style.background='#f0f4f8';
  if(e.dataTransfer.files.length>0) parseCSVFile(e.dataTransfer.files[0]);
});
csvDropEl.addEventListener('click',function(){csvFileEl.click();});
csvFileEl.addEventListener('change',function(){if(csvFileEl.files.length>0)parseCSVFile(csvFileEl.files[0]);});

function parseCSVFile(file){
  csvStatusEl.style.display='block';csvStatusEl.style.color='#1e3a5f';
  csvStatusEl.textContent='Bezig met laden: '+file.name+'...';

  var isExcel=file.name.match(/\.xlsx?$/i);

  if(isExcel){
    // Excel file — read as ArrayBuffer and parse with SheetJS
    var reader=new FileReader();
    reader.onload=function(e){
      try{
        var wb=XLSX.read(e.target.result,{type:'array'});
        var ws=wb.Sheets[wb.SheetNames[0]];
        var jsonData=XLSX.utils.sheet_to_json(ws,{defval:''});
        if(jsonData.length===0){csvStatusEl.style.color='#c62828';csvStatusEl.textContent='Excel bestand is leeg';return;}
        var headers=Object.keys(jsonData[0]).map(function(h){return h.trim();});
        var rows=jsonData.map(function(row){return headers.map(function(h){return String(row[h]||'');});});
        headers=headers.map(function(h){return h.toLowerCase();});
        processRows(headers,rows,file.name);
      }catch(err){
        csvStatusEl.style.color='#c62828';
        csvStatusEl.textContent='Fout bij Excel parsen: '+err.message;
      }
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  // CSV/TXT file
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var text=e.target.result;
      var lines=text.split(/\r?\n/).filter(function(l){return l.trim().length>0;});
      if(lines.length<2){csvStatusEl.style.color='#c62828';csvStatusEl.textContent='Bestand is leeg of heeft geen data';return;}

      // Detect separator
      var sep=',';
      if(lines[0].indexOf(';')>-1 && lines[0].indexOf(',')===-1) sep=';';
      if(lines[0].indexOf('\t')>-1 && lines[0].split('\t').length>lines[0].split(sep).length) sep='\t';

      var headers=lines[0].split(sep).map(function(h){return h.trim().replace(/^["']|["']$/g,'').toLowerCase();});
      var rows=[];
      for(var ri=1;ri<lines.length;ri++){
        rows.push(lines[ri].split(sep).map(function(v){return v.trim().replace(/^["']|["']$/g,'');}));
      }
      processRows(headers,rows,file.name);
    }catch(err){
      csvStatusEl.style.color='#c62828';
      csvStatusEl.textContent='Fout bij parsen: '+err.message;
    }
  };
  reader.readAsText(file);
}

function processRows(headers,rows,fileName){

      // Find column indices — flexible matching
      var colX=-1,colY=-1,colNaam=-1,colDiepte=-1,colDia=-1;
      var colType=-1;
      // Strip BOM from first header if present
      if(headers.length>0) headers[0]=headers[0].replace(/^\uFEFF/,'');

      headers.forEach(function(h,i){
        // Strip alles behalve letters en cijfers voor matching
        var hn=h.replace(/[^a-z0-9]/g,'');
        // X column
        if(colX<0 && (hn==='x'||hn==='rdx'||hn==='xrd'||hn==='xcoord'||hn==='xcoordinaat'||hn==='easting'||hn==='oost')) colX=i;
        // Y column
        if(colY<0 && (hn==='y'||hn==='rdy'||hn==='yrd'||hn==='ycoord'||hn==='ycoordinaat'||hn==='northing'||hn==='noord')) colY=i;
        // Name — match exact or contains patterns
        if(colNaam<0 && (hn==='naam'||hn==='name'||hn==='nr'||hn==='nummer'||hn==='punt'||hn==='puntid'||hn==='puntnr'||hn==='label'||hn==='code'||hn==='boringnr'||hn==='boornr'||hn==='putnr'||hn==='putnaam'||hn==='boorpunt'||hn==='boorpuntnr'||hn==='peilbuisnr'||hn==='meetpunt'||hn==='meetpuntnr')) colNaam=i;
        // Depth — fuzzy: bevat "diepte" of "depth" ergens in de header
        if(colDiepte<0 && (hn==='diepte'||hn==='depth'||hn==='meter'||hn==='boordiepte'||hn==='lengte'||hn==='einddiepte'||hn==='filterdiepte'||hn==='bodemdiepte'||hn.indexOf('diepte')>-1||hn.indexOf('depth')>-1)) colDiepte=i;
        // Diameter
        if(colDia<0 && (hn==='diameter'||hn==='dia'||hn==='mm'||hn==='buis'||hn.indexOf('diameter')>-1)) colDia=i;
        // Type
        if(colType<0 && (hn==='type'||hn==='soort'||hn==='boring'||hn==='categorie'||hn==='typeboring')) colType=i;
      });

      // Second pass: fuzzy matching if naam not found yet
      if(colNaam<0){
        headers.forEach(function(h,i){
          if(colNaam>=0||i===colX||i===colY||i===colDiepte||i===colDia||i===colType) return;
          var hn=h.replace(/[_\-\s\.]/g,'');
          if(hn.indexOf('nr')>-1||hn.indexOf('naam')>-1||hn.indexOf('name')>-1||hn.indexOf('punt')>-1||hn.indexOf('label')>-1||hn.indexOf('code')>-1||hn.indexOf('boor')>-1) colNaam=i;
        });
      }
      // Third pass: if still no naam column, pick first text-like column (not x/y/depth/dia/type/fid)
      if(colNaam<0){
        for(var ci=0;ci<headers.length;ci++){
          if(ci===colX||ci===colY||ci===colDiepte||ci===colDia||ci===colType) continue;
          var hn2=headers[ci].replace(/[_\-\s\.]/g,'');
          if(hn2==='fid'||hn2==='id'||hn2==='oid'||hn2==='objectid') continue;
          // Check if first data value in this column looks like a name (has letters)
          if(rows.length>0 && rows[0][ci] && /[a-zA-Z]/.test(rows[0][ci])){
            colNaam=ci;break;
          }
        }
      }

      // Fallback: if no headers matched, try positional
      if(colX<0 || colY<0){
        if(headers.length>=3){colNaam=0;colX=1;colY=2;}
        else if(headers.length>=2){colX=0;colY=1;}
        if(headers.length>=4) colDiepte=3;
        if(headers.length>=5) colDia=4;
        // Still no luck
        if(colX<0||colY<0){
          csvStatusEl.style.color='#c62828';
          csvStatusEl.textContent='Kon X/Y kolommen niet vinden. Gevonden headers: '+headers.join(', ');
          return;
        }
      }

      // Show detected columns
      var detectedInfo='Kolommen: '+(colNaam>=0?'Naam='+headers[colNaam]:'⚠️ geen naam')+', X='+headers[colX]+', Y='+headers[colY]+(colType>=0?', Type='+headers[colType]:'')+(colDiepte>=0?', Diepte='+headers[colDiepte]:' ⚠️ GEEN DIEPTE GEVONDEN');
      csvStatusEl.textContent=detectedInfo;
      console.log('CSV Import — Headers gevonden:',headers);
      console.log('CSV Import — Kolom indices: Naam='+colNaam+' X='+colX+' Y='+colY+' Diepte='+colDiepte+' Dia='+colDia+' Type='+colType);
      if(rows.length>0) console.log('CSV Import — Eerste rij:',rows[0]);

      var imported=0, skipped=0;
      for(var li=0;li<rows.length;li++){
        var vals=rows[li];
        var xVal=parseFloat(vals[colX]);
        var yVal=parseFloat(vals[colY]);
        if(isNaN(xVal)||isNaN(yVal)){skipped++;continue;}

        // Detect if WGS84 (lat/lng) vs RD — RD X is typically 0-300000, Y 300000-625000
        var rdX,rdY;
        if(xVal>1000 && yVal>1000){
          // Assume RD
          rdX=Math.round(xVal);rdY=Math.round(yVal);
        } else {
          // Assume WGS84 lat/lng — convert
          var rdC=wgs2rd(yVal,xVal); // lat=y, lng=x in WGS84
          rdX=rdC[0];rdY=rdC[1];
        }

        var naam=colNaam>=0&&vals[colNaam]?vals[colNaam]:('CSV'+(imported+1).toString().padStart(3,'0'));
        var type=colType>=0&&vals[colType]?vals[colType].trim():'';
        var typeLower=type.toLowerCase();

        // Diepte: neem over uit bestand, anders 0
        var diepteRaw=colDiepte>=0?String(vals[colDiepte]).replace(',','.'):'';
        var diepte=parseFloat(diepteRaw);
        // Negatieve dieptes (m-mv notatie) → absoluut
        if(!isNaN(diepte)&&diepte<0) diepte=Math.abs(diepte);
        if(isNaN(diepte)){
          // Probeer diepte uit type naam te halen (bijv. bo30 → 30m)
          var depthMatch=typeLower.match(/\d+/);
          diepte=depthMatch?parseInt(depthMatch[0]):0;
        }
        // Auto-detect cm vs m (>500 = waarschijnlijk cm)
        if(diepte>500) diepte=Math.round(diepte/100*10)/10;
        var diaRaw=colDia>=0?String(vals[colDia]).replace(',','.').replace(/[^0-9.]/g,''):'';
        var dia=parseFloat(diaRaw);
        if(isNaN(dia)||dia<1){
          var defaultDia=parseInt(document.getElementById('csvDefaultDia').value)||0;
          dia=defaultDia;
        }

        var ll=rd(rdX,rdY);
        var b={n:naam,x:rdX,y:rdY,d:diepte,dia:dia,lat:ll[0],lng:ll[1],custom:true,csv:true,type:type};
        data.push(b);
        addedPoints.push(b);
        attachPointLayers(b,'#0ff');

        imported++;
      }

      // Update
      grp=L.featureGroup(ms);
      if(imported>0) map.fitBounds(grp.getBounds().pad(0.12));
      refreshPointDataViews();

      csvStatusEl.style.color='#2e7d32';
      csvStatusEl.textContent='✅ '+imported+' punten geïmporteerd uit '+fileName+(skipped>0?' ('+skipped+' overgeslagen)':'');
}

// === KLIC IMPORT ===
var klicLayers=[]; // array of {name, layers[], visible}

// Create a custom pane for KLIC overlays so they don't block map clicks
map.createPane('klicPane');
map.getPane('klicPane').style.zIndex = 350; // between overlayPane (400) and tilePane (200)
map.getPane('klicPane').style.pointerEvents = 'none';
var klicDropEl=document.getElementById('klicDrop');
var klicFileEl=document.getElementById('klicFile');
var klicStatusEl=document.getElementById('klicStatus');

window.toggleKlic=function(){
  var vis=klicDropEl.style.display==='none';
  klicDropEl.style.display=vis?'block':'none';
  var btn=document.getElementById('klicBtn');
  btn.style.background=vis?'#e65100':'#ff6f00';
  btn.textContent=vis?'✕ Sluit KLIC':'⚡ KLIC';
};

klicDropEl.addEventListener('dragover',function(e){e.preventDefault();klicDropEl.style.background='#ffe0b2';});
klicDropEl.addEventListener('dragleave',function(e){e.preventDefault();klicDropEl.style.background='#fff8e1';});
klicDropEl.addEventListener('drop',function(e){
  e.preventDefault();klicDropEl.style.background='#fff8e1';
  for(var fi=0;fi<e.dataTransfer.files.length;fi++){
    if(e.dataTransfer.files[fi].name.match(/\.zip$/i)) processKlicZip(e.dataTransfer.files[fi]);
  }
});
klicDropEl.addEventListener('click',function(){klicFileEl.click();});
klicFileEl.addEventListener('change',function(){
  for(var fi=0;fi<klicFileEl.files.length;fi++) processKlicZip(klicFileEl.files[fi]);
});

function processKlicZip(file){
  klicStatusEl.style.display='block';klicStatusEl.style.color='#e65100';
  klicStatusEl.textContent='Laden: '+file.name+'...';

  var reader=new FileReader();
  reader.onload=function(e){
    JSZip.loadAsync(e.target.result).then(function(zip){
      var pngFiles={};
      var pgwFiles={};
      var gmlFiles=[];
      var xmlFiles=[];

      // Inventory all files
      zip.forEach(function(path,entry){
        var lower=path.toLowerCase();
        if(lower.endsWith('.png')&&!entry.dir) pngFiles[path]=entry;
        if(lower.endsWith('.pgw')) pgwFiles[path]=entry;
        if(lower.endsWith('.gml')) gmlFiles.push({path:path,entry:entry});
        if(lower.endsWith('.xml')) xmlFiles.push({path:path,entry:entry});
      });

      var pngPaths=Object.keys(pngFiles);
      klicStatusEl.textContent='Gevonden: '+pngPaths.length+' PNG kaartlagen, '+gmlFiles.length+' GML bestanden...';

      if(pngPaths.length===0&&gmlFiles.length===0&&xmlFiles.length===0){
        klicStatusEl.style.color='#c62828';
        klicStatusEl.textContent='Geen KLIC kaartlagen gevonden in '+file.name;
        return;
      }

      var klicEntry={name:file.name.replace(/\.zip$/i,''),layers:[],visible:true,overlays:[]};
      var promises=[];

      // Process PNGs with world files
      pngPaths.forEach(function(pngPath){
        // Find matching .pgw
        var basePath=pngPath.replace(/\.png$/i,'');
        var pgwPath=basePath+'.pgw';
        var pgwPathAlt=basePath+'.PGW';
        var matchedPgw=pgwFiles[pgwPath]||pgwFiles[pgwPathAlt];

        // Also try case variations
        if(!matchedPgw){
          Object.keys(pgwFiles).forEach(function(p){
            if(p.toLowerCase()===pgwPath.toLowerCase()) matchedPgw=pgwFiles[p];
          });
        }

        if(matchedPgw){
          var p=Promise.all([
            pngFiles[pngPath].async('base64'),
            matchedPgw.async('text')
          ]).then(function(results){
            var imgData='data:image/png;base64,'+results[0];
            var pgwLines=results[1].trim().split(/\r?\n/);
            if(pgwLines.length>=6){
              var pixelW=parseFloat(pgwLines[0]);  // pixel size X
              var pixelH=parseFloat(pgwLines[3]);  // pixel size Y (negative)
              var originX=parseFloat(pgwLines[4]);  // upper-left X (RD)
              var originY=parseFloat(pgwLines[5]);  // upper-left Y (RD)

              // We need image dimensions — create temp image
              return new Promise(function(resolve){
                var img=new Image();
                img.onload=function(){
                  var imgW=img.width;
                  var imgH=img.height;

                  // Calculate corners in RD
                  var rdMinX=originX;
                  var rdMaxY=originY;
                  var rdMaxX=originX+pixelW*imgW;
                  var rdMinY=originY+pixelH*imgH; // pixelH is negative

                  // Convert to WGS84
                  var sw=rd(rdMinX,rdMinY);
                  var ne=rd(rdMaxX,rdMaxY);

                  var bounds=[[sw[0],sw[1]],[ne[0],ne[1]]];
                  var overlay=L.imageOverlay(imgData,bounds,{opacity:0.7,interactive:false,pane:'klicPane'});
                  overlay.addTo(map);

                  // Extract layer name from path
                  var layerName=pngPath.split('/').pop().replace(/\.png$/i,'');
                  klicEntry.layers.push({name:layerName,overlay:overlay,type:'png'});
                  klicEntry.overlays.push(overlay);
                  resolve();
                };
                img.onerror=function(){resolve();};
                img.src=imgData;
              });
            }
          });
          promises.push(p);
        } else {
          // PNG without worldfile — try to find extent in XML
          var p2=pngFiles[pngPath].async('base64').then(function(b64){
            klicEntry.layers.push({name:pngPath.split('/').pop().replace(/\.png$/i,''),b64:b64,type:'png_noref'});
          });
          promises.push(p2);
        }
      });

      // Process GML files for vector data (graafpolygoon, leidingen)
      gmlFiles.forEach(function(gf){
        var p3=gf.entry.async('text').then(function(text){
          parseKlicGML(text,gf.path,klicEntry);
        });
        promises.push(p3);
      });

      // Also check XML files for graafpolygoon
      xmlFiles.forEach(function(xf){
        var p4=xf.entry.async('text').then(function(text){
          parseKlicXML(text,xf.path,klicEntry);
        });
        promises.push(p4);
      });

      Promise.all(promises).then(function(){
        klicLayers.push(klicEntry);
        updateKlicPanel();
        var mapped=klicEntry.layers.filter(function(l){return l.type==='png';}).length;
        var noref=klicEntry.layers.filter(function(l){return l.type==='png_noref';}).length;
        var vectors=klicEntry.layers.filter(function(l){return l.type==='polygon'||l.type==='line';}).length;
        // Debug: log detected themes
        console.log('=== KLIC Import: '+file.name+' ===');
        klicEntry.layers.forEach(function(l){console.log('  Laag: '+l.name+' | Type: '+l.type+' | Kleur: '+(l.color||'default'));});
        // Build summary per thema
        var themaSummary={};
        klicEntry.layers.forEach(function(l){
          var key=(l.color||'?')+' '+l.name;
          if(!themaSummary[l.name]) themaSummary[l.name]=l.color||'#ff6f00';
        });
        var summaryParts=[];
        klicEntry.layers.forEach(function(l){
          if(l.type!=='png_noref') summaryParts.push(l.name);
        });
        klicStatusEl.style.color='#2e7d32';
        klicStatusEl.innerHTML='✅ '+file.name+': '+mapped+' kaartlagen'+(vectors>0?', '+vectors+' vectorlagen':'')+(noref>0?' ('+noref+' zonder georef)':'')+'<br><span style="font-size:11px;color:#555">Lagen: '+summaryParts.join(' | ')+'</span>';
        document.getElementById('klicPanel').style.display='block';

        // Zoom to KLIC extent if overlays exist
        if(klicEntry.overlays.length>0){
          var allBounds=L.featureGroup(klicEntry.overlays);
          map.fitBounds(allBounds.getBounds().pad(0.1));
        }
      });
    }).catch(function(err){
      klicStatusEl.style.color='#c62828';
      klicStatusEl.textContent='Fout bij laden ZIP: '+err.message;
    });
  };
  reader.readAsArrayBuffer(file);
}

// Helper: vind alle elementen ongeacht namespace (gml:posList, posList, etc.)
function findAllByLocalName(doc,localName){
  var results=[];
  var all=doc.getElementsByTagName('*');
  for(var i=0;i<all.length;i++){
    if(all[i].localName===localName||all[i].localName.toLowerCase()===localName.toLowerCase()) results.push(all[i]);
  }
  return results;
}

// Helper: parse coordinate string (RD) to latlng array
// Handles 2D (x y x y...) and 3D (x y z x y z...) formats
function parseRDCoords(text){
  var nums=text.trim().split(/[\s,]+/).map(parseFloat).filter(function(n){return!isNaN(n);});
  if(nums.length<4) return[];
  var latlngs=[];
  // Detect 2D vs 3D: if every 3rd value is very small (z~0-50) and total%3===0, it's 3D
  var is3D=false;
  if(nums.length%3===0&&nums.length>=6){
    var zVals=[];for(var zi=2;zi<nums.length;zi+=3) zVals.push(nums[zi]);
    var allSmallZ=zVals.every(function(z){return Math.abs(z)<200;});
    var firstTwoBig=nums[0]>10000&&nums[1]>100000;
    if(allSmallZ&&firstTwoBig) is3D=true;
  }
  var step=is3D?3:2;
  for(var ci=0;ci<nums.length-1;ci+=step){
    var x=nums[ci],y=nums[ci+1];
    if(x>10000&&y>100000){
      var ll=rd(x,y);
      latlngs.push([ll[0],ll[1]]);
    }
  }
  return latlngs;
}

// Detecteer KLIC thema/type — meerdere detectiemethodes
function detectKlicThema(path,text){
  var sample=text.substring(0,5000);
  var lower=(path+' '+sample).toLowerCase();

  // === 1. IMKL v2 feature types in GML content ===
  if(sample.indexOf('ElectricityCable')>-1||sample.indexOf('electricityCable')>-1) return{color:'#e53935',label:'Elektra',thema:'elektra'};
  if(sample.indexOf('OilGasChemicalsPipe')>-1||sample.indexOf('oilGasChemicals')>-1) return{color:'#fdd835',label:'Gas/Chemie',thema:'gas'};
  if(sample.indexOf('WaterPipe')>-1||sample.indexOf('waterPipe')>-1) return{color:'#1e88e5',label:'Water',thema:'water'};
  if(sample.indexOf('TelecommunicationsCable')>-1||sample.indexOf('telecommunicationsCable')>-1) return{color:'#43a047',label:'Telecom',thema:'telecom'};
  if(sample.indexOf('SewerPipe')>-1||sample.indexOf('sewerPipe')>-1) return{color:'#6d4c41',label:'Riool',thema:'riool'};
  if(sample.indexOf('ThermalPipe')>-1||sample.indexOf('thermalPipe')>-1) return{color:'#ff6f00',label:'Warmte',thema:'warmte'};

  // === 2. IMKL thema element ===
  var themaMatch=sample.match(/[Tt]hema[>\s]*([^<]+)/);
  if(themaMatch){
    var t=themaMatch[1].toLowerCase().trim();
    if(t.indexOf('gas')>-1) return{color:'#fdd835',label:'Gas',thema:'gas'};
    if(t.indexOf('elektr')>-1||t.indexOf('electricity')>-1||t.indexOf('hoogspanning')>-1||t.indexOf('laagspanning')>-1||t.indexOf('middenspanning')>-1) return{color:'#e53935',label:'Elektra',thema:'elektra'};
    if(t.indexOf('water')>-1) return{color:'#1e88e5',label:'Water',thema:'water'};
    if(t.indexOf('telecom')>-1||t.indexOf('datatransport')>-1) return{color:'#43a047',label:'Telecom',thema:'telecom'};
    if(t.indexOf('riool')>-1||t.indexOf('riolering')>-1) return{color:'#6d4c41',label:'Riool',thema:'riool'};
    if(t.indexOf('warmte')>-1) return{color:'#ff6f00',label:'Warmte',thema:'warmte'};
  }

  // === 3. utilityNetworkType ===
  var untMatch=sample.match(/utilityNetworkType[>\s]*([^<]+)/i);
  if(untMatch){
    var u=untMatch[1].toLowerCase().trim();
    if(u.indexOf('electricity')>-1) return{color:'#e53935',label:'Elektra',thema:'elektra'};
    if(u.indexOf('gas')>-1||u.indexOf('oil')>-1||u.indexOf('chemical')>-1) return{color:'#fdd835',label:'Gas',thema:'gas'};
    if(u.indexOf('water')>-1) return{color:'#1e88e5',label:'Water',thema:'water'};
    if(u.indexOf('telecom')>-1) return{color:'#43a047',label:'Telecom',thema:'telecom'};
    if(u.indexOf('sewer')>-1) return{color:'#6d4c41',label:'Riool',thema:'riool'};
    if(u.indexOf('thermal')>-1) return{color:'#ff6f00',label:'Warmte',thema:'warmte'};
  }

  // === 4. Nederlandse keywords in pad + content ===
  if(lower.indexOf('gashogedruk')>-1||lower.indexOf('gas_hoge_druk')>-1||lower.indexOf('hogedruk')>-1) return{color:'#ff8f00',label:'Gas (HD)',thema:'gas'};
  if(lower.indexOf('gaslagedruk')>-1||lower.indexOf('gas_lage_druk')>-1||lower.indexOf('lagedruk')>-1) return{color:'#fdd835',label:'Gas (LD)',thema:'gas'};
  if(lower.indexOf('hoogspanning')>-1) return{color:'#b71c1c',label:'Elektra (HS)',thema:'elektra'};
  if(lower.indexOf('middenspanning')>-1) return{color:'#d32f2f',label:'Elektra (MS)',thema:'elektra'};
  if(lower.indexOf('laagspanning')>-1) return{color:'#ef5350',label:'Elektra (LS)',thema:'elektra'};
  if(lower.indexOf('elektr')>-1||lower.indexOf('stroom')>-1) return{color:'#e53935',label:'Elektra',thema:'elektra'};
  if(lower.indexOf('gas')>-1) return{color:'#fdd835',label:'Gas',thema:'gas'};
  if(lower.indexOf('drinkwater')>-1||lower.indexOf('waterleiding')>-1) return{color:'#1e88e5',label:'Water',thema:'water'};
  if(lower.indexOf('water')>-1&&lower.indexOf('grondwater')===-1) return{color:'#1e88e5',label:'Water',thema:'water'};
  if(lower.indexOf('glasvezel')>-1||lower.indexOf('fiber')>-1) return{color:'#66bb6a',label:'Glasvezel',thema:'telecom'};
  if(lower.indexOf('telecom')>-1||lower.indexOf('datatransport')>-1) return{color:'#43a047',label:'Telecom',thema:'telecom'};
  if(lower.indexOf('riool')>-1||lower.indexOf('riolering')>-1||lower.indexOf('sewer')>-1||lower.indexOf('overdruk')>-1||lower.indexOf('onderdruk')>-1) return{color:'#6d4c41',label:'Riool',thema:'riool'};
  if(lower.indexOf('warmte')>-1||lower.indexOf('stadsverwarming')>-1) return{color:'#ff6f00',label:'Warmte',thema:'warmte'};
  if(lower.indexOf('petrochemie')>-1||lower.indexOf('chemie')>-1) return{color:'#8e24aa',label:'Petrochemie',thema:'chemie'};
  if(lower.indexOf('buisleiding')>-1) return{color:'#ff8f00',label:'Buisleiding',thema:'buis'};

  // === 5. Netbeheerder namen → type mapping ===
  // Elektra + Gas netbeheerders (dual: check content for specifiek type)
  var dualBeheerders=['liander','stedin','enexis','westland infra','endinet','cogas','rendo'];
  var isDual=dualBeheerders.some(function(nb){return lower.indexOf(nb)>-1;});
  if(isDual){
    // Bij dual netbeheerders: check of het specifiek gas of elektra is
    if(lower.indexOf('gas')>-1) return{color:'#fdd835',label:'Gas',thema:'gas'};
    if(lower.indexOf('elek')>-1||lower.indexOf('kabel')>-1||lower.indexOf('cable')>-1) return{color:'#e53935',label:'Elektra',thema:'elektra'};
    // Default dual = elektra (meest voorkomend)
    return{color:'#e53935',label:'Elektra',thema:'elektra'};
  }
  // Pure gas
  if(lower.indexOf('gasunie')>-1) return{color:'#ff8f00',label:'Gas (HD)',thema:'gas'};
  // Water
  var waterBeheerders=['pwn','vitens','brabant water','dunea','evides','oasen','wmd','waternet','waterbedrijf'];
  if(waterBeheerders.some(function(nb){return lower.indexOf(nb)>-1;})) return{color:'#1e88e5',label:'Water',thema:'water'};
  // Telecom
  var teleBeheerders=['kpn','glaspoort','eurofiber','ziggo','t-mobile','tele2','delta','caiway','reggefiber','digitale stad'];
  if(teleBeheerders.some(function(nb){return lower.indexOf(nb)>-1;})) return{color:'#43a047',label:'Telecom',thema:'telecom'};
  // Warmte
  if(lower.indexOf('vattenfall')>-1||lower.indexOf('ennatuurlijk')>-1||lower.indexOf('purmerend')>-1) return{color:'#ff6f00',label:'Warmte',thema:'warmte'};
  // TenneT = hoogspanning
  if(lower.indexOf('tennet')>-1) return{color:'#b71c1c',label:'Elektra (HS)',thema:'elektra'};

  // === 6. Overig ===
  if(lower.indexOf('overig')>-1) return{color:'#78909c',label:'Overig',thema:'overig'};
  return{color:'#666',label:'Onbekend',thema:'onbekend'};
}

// === IMKL v2 NETWERK TYPE → KLEUR MAPPING ===
var KLIC_NET_COLORS={
  'water':{color:'#1e88e5',label:'Water'},
  'electricity':{color:'#e53935',label:'Elektra'},
  'electricityls':{color:'#ef5350',label:'Elektra (LS)'},
  'electricityms':{color:'#d32f2f',label:'Elektra (MS)'},
  'electricityhs':{color:'#b71c1c',label:'Elektra (HS)'},
  'oilgaschemicals':{color:'#fdd835',label:'Gas/Chemie'},
  'oilgaschemicalsgld':{color:'#fdd835',label:'Gas (LD)'},
  'oilgaschemicalsghd':{color:'#ff8f00',label:'Gas (HD)'},
  'telecommunications':{color:'#43a047',label:'Telecom'},
  'datatransport':{color:'#43a047',label:'Datatransport'},
  'sewer':{color:'#6d4c41',label:'Riool'},
  'thermal':{color:'#ff6f00',label:'Warmte'},
  'default':{color:'#78909c',label:'Overig'}
};

function getNetColor(networkRef){
  if(!networkRef) return KLIC_NET_COLORS['default'];
  var lower=networkRef.toLowerCase();
  // Match UNET_type patterns: UNET_water_10, UNET_electricityLS_8, UNET_oilGasChemicalsGLD_5
  var match=lower.match(/unet_([a-z]+)/);
  if(match){
    var key=match[1];
    // Direct match
    if(KLIC_NET_COLORS[key]) return KLIC_NET_COLORS[key];
    // Partial matches
    if(key.indexOf('water')===0) return KLIC_NET_COLORS['water'];
    if(key.indexOf('electricityls')===0) return KLIC_NET_COLORS['electricityls'];
    if(key.indexOf('electricityms')===0) return KLIC_NET_COLORS['electricityms'];
    if(key.indexOf('electricityhs')===0) return KLIC_NET_COLORS['electricityhs'];
    if(key.indexOf('electricity')===0) return KLIC_NET_COLORS['electricity'];
    if(key.indexOf('oilgaschemicalsgld')===0) return KLIC_NET_COLORS['oilgaschemicalsgld'];
    if(key.indexOf('oilgaschemicalsghd')===0) return KLIC_NET_COLORS['oilgaschemicalsghd'];
    if(key.indexOf('oilgaschemicals')===0) return KLIC_NET_COLORS['oilgaschemicals'];
    if(key.indexOf('telecom')===0) return KLIC_NET_COLORS['telecommunications'];
    if(key.indexOf('datatransport')===0) return KLIC_NET_COLORS['datatransport'];
    if(key.indexOf('sewer')===0) return KLIC_NET_COLORS['sewer'];
    if(key.indexOf('thermal')===0) return KLIC_NET_COLORS['thermal'];
  }
  // Fallback: check localId patterns (UL_Water_, UL_IMKL_Elektriciteitskabel, etc.)
  if(lower.indexOf('water')>-1) return KLIC_NET_COLORS['water'];
  if(lower.indexOf('elektriciteit')>-1||lower.indexOf('electricity')>-1) return KLIC_NET_COLORS['electricity'];
  if(lower.indexOf('olie')>-1||lower.indexOf('gas')>-1||lower.indexOf('chemicali')>-1) return KLIC_NET_COLORS['oilgaschemicals'];
  if(lower.indexOf('telecom')>-1||lower.indexOf('datatransport')>-1) return KLIC_NET_COLORS['telecommunications'];
  if(lower.indexOf('riool')>-1||lower.indexOf('sewer')>-1) return KLIC_NET_COLORS['sewer'];
  if(lower.indexOf('warmte')>-1||lower.indexOf('thermal')>-1) return KLIC_NET_COLORS['thermal'];
  return KLIC_NET_COLORS['default'];
}

function parseKlicGML(text,path,klicEntry){
  // For non-GI files (separate GML per netbeheerder), use old approach
  var thema=detectKlicThema(path,text);
  try{
    var parser=new DOMParser();
    var doc=parser.parseFromString(text,'text/xml');
    var lineStringEls=findAllByLocalName(doc,'LineString');
    var lineCoords=[];
    lineStringEls.forEach(function(lsEl){
      var pls=findAllByLocalName(lsEl,'posList');
      pls.forEach(function(pl){
        var latlngs=parseRDCoords(pl.textContent);
        if(latlngs.length>=2) lineCoords.push(latlngs);
      });
    });
    var curveEls=findAllByLocalName(doc,'Curve');
    curveEls.forEach(function(curveEl){
      var pls=findAllByLocalName(curveEl,'posList');
      pls.forEach(function(pl){
        var latlngs=parseRDCoords(pl.textContent);
        if(latlngs.length>=2) lineCoords.push(latlngs);
      });
    });
    if(lineCoords.length>0){
      var multiLine=L.polyline(lineCoords,{color:thema.color,weight:2.5,opacity:0.85,interactive:false,pane:'klicPane'});
      multiLine.addTo(map);
      var layerName=thema.label;
      multiLine.bindPopup('<b>'+layerName+'</b><br>'+lineCoords.length+' segmenten');
      klicEntry.layers.push({name:layerName,overlay:multiLine,type:'line',color:thema.color});
      klicEntry.overlays.push(multiLine);
    }
  }catch(e){console.log('GML parse error:',e);}
}

function parseKlicXML(text,path,klicEntry){
  try{
    var parser=new DOMParser();
    var doc=parser.parseFromString(text,'text/xml');
    var isGI=path.toLowerCase().indexOf('gebiedsinformatie')>-1||text.substring(0,3000).indexOf('GebiedsinformatieLevering')>-1;

    if(!isGI) return; // Alleen GI XML verwerken

    console.log('KLIC: Parsing IMKL v2 GI bestand: '+path);

    // === 1. GRAAFPOLYGOON ===
    var graafEls=findAllByLocalName(doc,'Graafpolygoon');
    graafEls.forEach(function(el){
      var pls=findAllByLocalName(el,'posList');
      pls.forEach(function(pl){
        var latlngs=parseRDCoords(pl.textContent);
        if(latlngs.length>=3){
          var poly=L.polygon(latlngs,{color:'#ff6f00',weight:3,fillColor:'#ff6f00',fillOpacity:0.08,dashArray:'10,5',interactive:false,pane:'klicPane'});
          poly.addTo(map);
          poly.bindPopup('<b>Graafgebied</b>');
          klicEntry.layers.push({name:'Graafgebied',overlay:poly,type:'polygon',color:'#ff6f00'});
          klicEntry.overlays.push(poly);
        }
      });
    });

    // === 2. INFORMATIEPOLYGOON ===
    var infoEls=findAllByLocalName(doc,'Informatiepolygoon');
    infoEls.forEach(function(el){
      // Pak alleen de eerste geometrie (niet geometrieVoorVisualisatie)
      var geomEl=findAllByLocalName(el,'geometrie')[0];
      if(geomEl){
        var pls=findAllByLocalName(geomEl,'posList');
        if(pls.length>0){
          var latlngs=parseRDCoords(pls[0].textContent);
          if(latlngs.length>=3){
            var poly=L.polygon(latlngs,{color:'#90a4ae',weight:1.5,fillColor:'#90a4ae',fillOpacity:0.05,dashArray:'4,4',interactive:false,pane:'klicPane'});
            poly.addTo(map);
            poly.bindPopup('<b>Informatiegebied</b>');
            klicEntry.layers.push({name:'Informatiegebied',overlay:poly,type:'polygon',color:'#90a4ae'});
            klicEntry.overlays.push(poly);
          }
        }
      }
    });

    // === 3. UTILITYLINKS — leidingen per netwerk-type, gegroepeerd op kleur ===
    var utilLinks=findAllByLocalName(doc,'UtilityLink');
    console.log('KLIC: Gevonden '+utilLinks.length+' UtilityLink features');

    // Groepeer per netwerk
    var netGroups={};
    utilLinks.forEach(function(ul){
      // Vind inNetwork href
      var inNetEls=findAllByLocalName(ul,'inNetwork');
      var netRef='';
      if(inNetEls.length>0){
        netRef=inNetEls[0].getAttribute('xlink:href')||inNetEls[0].getAttribute('href')||inNetEls[0].textContent||'';
      }
      // Vind ook localId als fallback
      var localIdEls=findAllByLocalName(ul,'localId');
      var localId=localIdEls.length>0?localIdEls[0].textContent:'';

      var netInfo=getNetColor(netRef||localId);
      var groupKey=netInfo.label;

      if(!netGroups[groupKey]) netGroups[groupKey]={color:netInfo.color,label:netInfo.label,lines:[]};

      // Extract geometry: direct posList search covers all geometry types
      // (LineString, Curve > LineStringSegment, etc.)
      var allPosLists=findAllByLocalName(ul,'posList');
      allPosLists.forEach(function(pl){
        var latlngs=parseRDCoords(pl.textContent);
        if(latlngs.length>=2) netGroups[groupKey].lines.push(latlngs);
      });
      // Also check for pos elements (single points in some KLIC files)
      var allPos=findAllByLocalName(ul,'pos');
      if(allPos.length>=2 && allPosLists.length===0){
        var pointCoords=[];
        allPos.forEach(function(p){
          var nums=p.textContent.trim().split(/[\s,]+/).map(parseFloat);
          if(nums.length>=2 && nums[0]>10000 && nums[1]>100000){
            var ll=rd(nums[0],nums[1]);
            pointCoords.push([ll[0],ll[1]]);
          }
        });
        if(pointCoords.length>=2) netGroups[groupKey].lines.push(pointCoords);
      }
    });

    // Create layer per groep
    Object.keys(netGroups).forEach(function(key){
      var grp=netGroups[key];
      if(grp.lines.length===0) return;
      console.log('KLIC: Laag "'+grp.label+'" → '+grp.lines.length+' segmenten, kleur: '+grp.color);
      var multiLine=L.polyline(grp.lines,{color:grp.color,weight:3,opacity:0.9,interactive:false,pane:'klicPane'});
      multiLine.addTo(map);
      multiLine.bindPopup('<b>'+grp.label+'</b><br>'+grp.lines.length+' segmenten');
      klicEntry.layers.push({name:grp.label,overlay:multiLine,type:'line',color:grp.color});
      klicEntry.overlays.push(multiLine);
    });

  }catch(e){console.log('XML parse error ('+path+'):',e);}
}

function updateKlicPanel(){
  var el=document.getElementById('klicLagenList');
  if(!el) return;
  var h='';
  klicLayers.forEach(function(kl,ki){
    h+='<div style="margin:4px 0"><b style="color:#e65100;font-size:11px">'+kl.name+'</b><br>';
    kl.layers.forEach(function(layer,li){
      var col=layer.color||'#ff6f00';
      var icon=layer.type==='polygon'?'◆':layer.type==='line'?'━':layer.type==='png'?'🗺️':'📄';
      h+='<label style="margin:0 4px 2px 0;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:3px" title="'+layer.name+'">';
      h+='<input type="checkbox" checked onchange="toggleKlicLayer('+ki+','+li+',this.checked)">';
      h+='<span style="display:inline-block;width:12px;height:3px;background:'+col+';border-radius:1px"></span>';
      h+='<span style="color:'+col+';font-weight:600">'+layer.name.substring(0,25)+'</span></label> ';
    });
    h+='</div>';
  });
  el.innerHTML=h;
}

window.toggleKlicLayer=function(ki,li,vis){
  var layer=klicLayers[ki].layers[li];
  if(layer.overlay){
    if(vis) layer.overlay.addTo(map);
    else map.removeLayer(layer.overlay);
  }
};

window.setKlicOpacity=function(val){
  var op=val/100;
  klicLayers.forEach(function(kl){
    kl.layers.forEach(function(l){
      if(l.overlay){
        if(l.overlay.setOpacity) l.overlay.setOpacity(op);
        if(l.overlay.setStyle) l.overlay.setStyle({opacity:op,fillOpacity:op*0.15});
      }
    });
  });
};

window.clearAllKlic=function(){
  klicLayers.forEach(function(kl){
    kl.layers.forEach(function(l){
      if(l.overlay) map.removeLayer(l.overlay);
    });
  });
  klicLayers=[];
  updateKlicPanel();
  document.getElementById('klicPanel').style.display='none';
};

// === MEETFUNCTIE ===
var measureMode=false;
var measurePoints=[];
var measureMarkers=[];
var measureLines=[];
var measureLabels=[];
var measureTotal=0;

window.toggleMeasure=function(){
  // Turn off add mode if active
  if(addMode) toggleAdd();

  measureMode=!measureMode;
  var btn=document.getElementById('measureBtn');
  if(measureMode){
    btn.style.background='#4a148c';btn.textContent='📏 Meten... (klik)';
    map.getContainer().style.cursor='crosshair';
    clearMeasure();
    showMeasurePanel(true);
  } else {
    btn.style.background='#6a1b9a';btn.textContent='📏 Meten';
    map.getContainer().style.cursor='';
    showMeasurePanel(false);
  }
};

function showMeasurePanel(show){
  var existing=document.getElementById('measurePanel');
  if(!show){
    if(existing) existing.style.display='none';
    return;
  }
  if(!existing){
    var panel=document.createElement('div');
    panel.id='measurePanel';
    panel.style.cssText='padding:8px 16px;background:#f3e5f5;font-size:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap';
    panel.innerHTML='📏 Klik op de kaart om afstanden te meten &nbsp;|&nbsp; '+
      '<span id="measureInfo" style="font-weight:600;color:#4a148c">0 punten — 0 m</span> &nbsp;|&nbsp; '+
      '<button onclick="undoMeasure()" style="padding:3px 10px;border:1px solid #6a1b9a;border-radius:4px;font-size:11px;cursor:pointer;background:#fff;font-weight:600;color:#6a1b9a">↩ Laatste punt</button> '+
      '<button onclick="clearMeasure()" style="padding:3px 10px;border:1px solid #c62828;border-radius:4px;font-size:11px;cursor:pointer;background:#fff;font-weight:600;color:#c62828">🗑️ Wis meting</button>';
    // Insert before map
    var mapEl=document.getElementById('map');
    mapEl.parentNode.insertBefore(panel,mapEl);
  } else {
    existing.style.display='flex';
  }
  updateMeasureInfo();
}

function updateMeasureInfo(){
  var el=document.getElementById('measureInfo');
  if(!el) return;
  var n=measurePoints.length;
  if(n<2){
    el.textContent=n+' punt'+(n!==1?'en':'')+' — klik voor meer';
  } else {
    var txt=n+' punten — ';
    if(measureTotal<1000){
      txt+=measureTotal.toFixed(1)+' m';
    } else {
      txt+=(measureTotal/1000).toFixed(3)+' km';
    }
    // Show last segment
    var lastDist=distLatLng(measurePoints[n-2],measurePoints[n-1]);
    txt+=' (laatste: '+(lastDist<1000?lastDist.toFixed(1)+' m':(lastDist/1000).toFixed(3)+' km')+')';
    el.textContent=txt;
  }
}

function distLatLng(a,b){
  // Haversine
  var R=6371000;
  var dLat=(b[0]-a[0])*Math.PI/180;
  var dLng=(b[1]-a[1])*Math.PI/180;
  var sLat=Math.sin(dLat/2);
  var sLng=Math.sin(dLng/2);
  var h=sLat*sLat+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*sLng*sLng;
  return 2*R*Math.asin(Math.sqrt(h));
}

// Hook into map click for measuring
map.on('click',function(e){
  if(!measureMode) return;
  var ll=[e.latlng.lat,e.latlng.lng];
  measurePoints.push(ll);

  // Place marker
  var idx=measurePoints.length;
  var mk=L.circleMarker([ll[0],ll[1]],{
    radius:5, fillColor:'#6a1b9a', color:'#fff', weight:2, fillOpacity:1
  }).addTo(map);
  mk.bindPopup('<b>Meetpunt '+idx+'</b>');
  measureMarkers.push(mk);

  // Draw line to previous point
  if(measurePoints.length>=2){
    var prev=measurePoints[measurePoints.length-2];
    var line=L.polyline([prev,ll],{color:'#6a1b9a',weight:3,dashArray:'8,6',opacity:0.85}).addTo(map);
    measureLines.push(line);

    var segDist=distLatLng(prev,ll);
    measureTotal+=segDist;

    // Label at midpoint
    var midLat=(prev[0]+ll[0])/2;
    var midLng=(prev[1]+ll[1])/2;
    var labelText=segDist<1000?segDist.toFixed(1)+'m':(segDist/1000).toFixed(3)+'km';
    var lbl=L.marker([midLat,midLng],{icon:L.divIcon({
      className:'',iconSize:[0,0],
      html:'<div style="font-size:10px;font-weight:700;color:#4a148c;background:rgba(255,255,255,0.85);padding:1px 5px;border-radius:3px;border:1px solid #6a1b9a;transform:translate(-50%,-50%);white-space:nowrap">'+labelText+'</div>'
    })}).addTo(map);
    measureLabels.push(lbl);
  }

  updateMeasureInfo();
});

window.undoMeasure=function(){
  if(measurePoints.length===0) return;
  measurePoints.pop();
  // Remove last marker
  if(measureMarkers.length>0){var mk=measureMarkers.pop();map.removeLayer(mk);}
  // Remove last line + label
  if(measureLines.length>0){
    var ln=measureLines.pop();
    var segDist2=0;
    if(measurePoints.length>=1 && measureLines.length>=0){
      // Recalculate total
      measureTotal=0;
      for(var si=1;si<measurePoints.length;si++){
        measureTotal+=distLatLng(measurePoints[si-1],measurePoints[si]);
      }
    } else { measureTotal=0; }
    map.removeLayer(ln);
  }
  if(measureLabels.length>0){var lb=measureLabels.pop();map.removeLayer(lb);}
  updateMeasureInfo();
};

window.clearMeasure=function(){
  measurePoints=[];
  measureTotal=0;
  measureMarkers.forEach(function(m){map.removeLayer(m);});
  measureLines.forEach(function(l){map.removeLayer(l);});
  measureLabels.forEach(function(l){map.removeLayer(l);});
  measureMarkers=[];measureLines=[];measureLabels=[];
  updateMeasureInfo();
};

// === PROJECT OPSLAAN / LADEN (Supabase) ===
var projectPanelVisible=false;
var currentProjectNr='';
var currentKlant='';

window.toggleProjectPanel=function(){
  projectPanelVisible=!projectPanelVisible;
  var panel=document.getElementById('projectPanel');
  if(!panel){
    panel=document.createElement('div');
    panel.id='projectPanel';
    panel.style.cssText='padding:12px 16px;background:#e3f2fd;font-size:12px;border-bottom:2px solid #1565c0;';
    panel.innerHTML='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
      '<b style="color:#1565c0">Klant:</b>'+
      '<input id="klantNaam" type="text" list="klantSuggesties" placeholder="bijv. Arcadis" value="'+currentKlant+'" style="width:130px;padding:4px 8px;font-size:12px;border:1px solid #1565c0;border-radius:4px" oninput="updateKlantSuggesties()">'+
      '<datalist id="klantSuggesties"></datalist>'+
      '<b style="color:#1565c0">Project:</b>'+
      '<input id="projectNr" type="text" placeholder="bijv. 2024-001" value="'+currentProjectNr+'" style="width:130px;padding:4px 8px;font-size:12px;border:1px solid #1565c0;border-radius:4px">'+
      '<button onclick="saveProject()" style="padding:4px 12px;background:#1565c0;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer">Opslaan</button>'+
      '<button onclick="loadProjectList()" style="padding:4px 12px;background:#2e7d32;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer">Laden</button>'+
      '<button onclick="deleteProject()" style="padding:4px 12px;background:#c62828;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer">Verwijderen</button>'+
      '<button onclick="exportDropbox()" style="padding:4px 12px;background:#0061fe;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer">\u{1F4E6} Dropbox</button>'+
      '<span id="projectStatus" style="font-size:11px;color:#666"></span>'+
      '</div>'+
      '<div id="projectList" style="margin-top:8px;display:none"></div>';
    var ctrl=document.getElementById('ctrl');
    ctrl.parentNode.insertBefore(panel,ctrl.nextSibling);
  }
  panel.style.display=projectPanelVisible?'block':'none';
  var btn=document.getElementById('projectBtn');
  if(btn){btn.style.background=projectPanelVisible?'#0d47a1':'#1565c0';}
};

// Helper: serialize KLIC layers for saving
function serializeKlicLayers(){
  var result=[];
  klicLayers.forEach(function(kl){
    var entry={name:kl.name,visible:kl.visible,layers:[]};
    kl.layers.forEach(function(l){
      var layerData={name:l.name,type:l.type,color:l.color||null};
      if(l.type==='polygon'&&l.overlay&&l.overlay.getLatLngs){
        var rings=l.overlay.getLatLngs();
        layerData.latlngs=JSON.parse(JSON.stringify(rings));
      }
      if(l.type==='line'&&l.overlay&&l.overlay.getLatLngs){
        layerData.latlngs=JSON.parse(JSON.stringify(l.overlay.getLatLngs()));
      }
      if(l.type==='png'&&l.overlay&&l.overlay.getBounds){
        var b=l.overlay.getBounds();
        layerData.bounds=[[b.getSouth(),b.getWest()],[b.getNorth(),b.getEast()]];
        // Store base64 image if available
        var imgEl=l.overlay._image||l.overlay.getElement();
        if(imgEl&&imgEl.src&&imgEl.src.indexOf('data:')===0){
          layerData.imgData=imgEl.src;
        }
      }
      entry.layers.push(layerData);
    });
    result.push(entry);
  });
  return result;
}

// Helper: restore KLIC layers from saved data
function restoreKlicLayers(savedKlic){
  // Clear existing
  klicLayers.forEach(function(kl){
    kl.layers.forEach(function(l){if(l.overlay)map.removeLayer(l.overlay);});
  });
  klicLayers=[];
  if(!savedKlic||savedKlic.length===0){
    document.getElementById('klicPanel').style.display='none';
    return;
  }
  savedKlic.forEach(function(entry){
    var klicEntry={name:entry.name,layers:[],visible:entry.visible!==false,overlays:[]};
    entry.layers.forEach(function(l){
      var overlay=null;
      if(l.type==='polygon'&&l.latlngs){
        overlay=L.polygon(l.latlngs,{color:l.color||'#ff6f00',weight:2,dashArray:'8,4',fillOpacity:0.08});
        overlay.addTo(map);
      }
      if(l.type==='line'&&l.latlngs){
        overlay=L.polyline(l.latlngs,{color:l.color||'#666',weight:2.5,opacity:0.85});
        overlay.addTo(map);
      }
      if(l.type==='png'&&l.bounds&&l.imgData){
        overlay=L.imageOverlay(l.imgData,l.bounds,{opacity:0.7});
        overlay.addTo(map);
      }
      var restored={name:l.name,type:l.type,color:l.color,overlay:overlay};
      klicEntry.layers.push(restored);
      if(overlay) klicEntry.overlays.push(overlay);
    });
    klicLayers.push(klicEntry);
  });
  // Update KLIC panel
  if(klicLayers.length>0){
    document.getElementById('klicPanel').style.display='block';
    updateKlicPanel();
  }
}

// Update KLIC lagen panel UI
function updateKlicPanel(){
  var html='';
  klicLayers.forEach(function(kl,ki){
    kl.layers.forEach(function(l,li){
      if(l.type==='png_noref') return;
      var isOn=l.overlay&&map.hasLayer(l.overlay);
      var colorDot=l.color?'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+l.color+';margin-right:3px"></span>':'';
      html+='<button onclick="toggleKlicLayer('+ki+','+li+')" style="padding:2px 8px;border:1px solid '+(isOn?'#e65100':'#ccc')+';border-radius:3px;font-size:10px;cursor:pointer;background:'+(isOn?'#fff8e1':'#eee')+';font-weight:'+(isOn?'600':'400')+';margin:1px">'+colorDot+l.name+'</button>';
    });
  });
  document.getElementById('klicLagenList').innerHTML=html;
}

// Klant suggesties bijwerken
window.updateKlantSuggesties=function(){
  var allProjects=JSON.parse(localStorage.getItem('boorpunt_projects')||'{}');
  var klanten={};
  Object.keys(allProjects).forEach(function(k){
    var p=allProjects[k];
    if(p.klant) klanten[p.klant]=true;
  });
  var dl=document.getElementById('klantSuggesties');
  if(dl) dl.innerHTML=Object.keys(klanten).map(function(k){return '<option value="'+k+'">';}).join('');
};

// Bidirectional sync: Supabase ↔ localStorage
(function syncProjects(){
  if(!window.__supabaseData){
    console.warn('Boorpunt sync: __supabaseData niet beschikbaar');
    return;
  }
  var sbData=window.__supabaseData;
  var allProjects=JSON.parse(localStorage.getItem('boorpunt_projects')||'{}');
  var lsChanged=false;
  var sbKeys=Object.keys(sbData).filter(function(k){return k.indexOf('project_')===0 && sbData[k];});
  console.log('Boorpunt sync: '+sbKeys.length+' projecten in Supabase, '+Object.keys(allProjects).length+' in localStorage');

  // 1) Supabase → localStorage (Supabase wins if newer)
  sbKeys.forEach(function(key){
    var projectKey=key.substring(8);
    var sbProj=sbData[key];
    var lsProj=allProjects[projectKey];
    if(!lsProj || (sbProj.savedAt && (!lsProj.savedAt || sbProj.savedAt > lsProj.savedAt))){
      allProjects[projectKey]=sbProj;
      lsChanged=true;
    }
  });

  // 2) localStorage → Supabase (push projects that only exist locally or are newer)
  if(window.__supabaseSave){
    var pushCount=0;
    Object.keys(allProjects).forEach(function(projectKey){
      var sbKey='project_'+projectKey;
      var sbProj=sbData[sbKey];
      var lsProj=allProjects[projectKey];
      if(!sbProj || (lsProj.savedAt && (!sbProj.savedAt || lsProj.savedAt > sbProj.savedAt))){
        window.__supabaseSave(sbKey,lsProj);
        pushCount++;
      }
    });
    if(pushCount>0){
      window.__supabaseSave('projects_index',Object.keys(allProjects));
      console.log('Boorpunt: pushed '+pushCount+' local projects to Supabase');
    }
  }

  if(lsChanged){
    localStorage.setItem('boorpunt_projects',JSON.stringify(allProjects));
    console.log('Boorpunt: pulled '+sbKeys.length+' projects from Supabase to localStorage');
  }
})();

window.saveProject=function(){
  var nr=document.getElementById('projectNr').value.trim();
  var klant=document.getElementById('klantNaam').value.trim();
  if(!nr){alert('Vul een projectnummer in');return;}
  currentProjectNr=nr;
  currentKlant=klant;
  var projectKey=klant?(klant+'__'+nr):nr;
  var projectData={
    projectNr:nr,
    klant:klant,
    boreholes:data.map(function(b){return{n:b.n,x:b.x,y:b.y,d:b.d,dia:b.dia,type:b.type||'',custom:b.custom||false};}),
    klicLayers:serializeKlicLayers(),
    savedAt:new Date().toISOString()
  };
  // Save to localStorage
  var allProjects=JSON.parse(localStorage.getItem('boorpunt_projects')||'{}');
  allProjects[projectKey]=projectData;
  localStorage.setItem('boorpunt_projects',JSON.stringify(allProjects));
  // Save to Supabase if available
  if(window.__supabaseSave){
    window.__supabaseSave('project_'+projectKey,projectData);
    window.__supabaseSave('projects_index',Object.keys(allProjects));
  }
  var label=klant?(klant+' / '+nr):nr;
  document.getElementById('projectStatus').textContent='\u2705 Project '+label+' opgeslagen ('+data.length+' punten)';
  document.getElementById('projectStatus').style.color='#2e7d32';
};

window.loadProjectList=async function(){
  var listEl=document.getElementById('projectList');
  listEl.style.display='block';
  var allProjects=JSON.parse(localStorage.getItem('boorpunt_projects')||'{}');
  var keys=Object.keys(allProjects);

  // Als localStorage leeg of weinig projecten: live herladen uit Supabase
  if(keys.length<=1 && window.__supabaseLoad){
    listEl.innerHTML='<span style="color:#1565c0">⏳ Projecten ophalen uit cloud...</span>';
    try{
      var freshData=await window.__supabaseLoad();
      var pullCount=0;
      Object.keys(freshData).forEach(function(key){
        if(key.indexOf('project_')===0 && freshData[key]){
          var projectKey=key.substring(8);
          var sbProj=freshData[key];
          var lsProj=allProjects[projectKey];
          if(!lsProj || (sbProj.savedAt && (!lsProj.savedAt || sbProj.savedAt>lsProj.savedAt))){
            allProjects[projectKey]=sbProj;
            pullCount++;
          }
        }
      });
      if(pullCount>0){
        localStorage.setItem('boorpunt_projects',JSON.stringify(allProjects));
        console.log('Boorpunt: '+pullCount+' projecten live opgehaald uit Supabase');
      }
      keys=Object.keys(allProjects);
    }catch(e){
      console.error('Supabase live load mislukt:',e);
    }
  }

  if(keys.length===0){
    listEl.innerHTML='<span style="color:#666">Geen opgeslagen projecten gevonden (lokaal noch in cloud).</span>';
    return;
  }
  // Groepeer per klant
  var grouped={};
  keys.forEach(function(k){
    var p=allProjects[k];
    var klant=p.klant||'Zonder klant';
    if(!grouped[klant]) grouped[klant]=[];
    grouped[klant].push({key:k,project:p});
  });
  var html='';
  Object.keys(grouped).sort().forEach(function(klant){
    html+='<div style="margin:6px 0"><b style="color:#1565c0;font-size:12px">\u{1F4C1} '+klant+'</b><br>';
    grouped[klant].forEach(function(item){
      var p=item.project;
      var count=p.boreholes?p.boreholes.length:0;
      var hasKlic=p.klicLayers&&p.klicLayers.length>0;
      var date=p.savedAt?new Date(p.savedAt).toLocaleDateString('nl-NL'):'';
      var label=p.projectNr||item.key;
      var safeKey=item.key.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
      html+='<button onclick="loadProject(\''+safeKey+'\')" style="margin:2px 4px;padding:4px 12px;background:#fff;border:1px solid #1565c0;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600;color:#1565c0">'+label+' ('+count+' punten'+(hasKlic?' + KLIC':'')+', '+date+')</button>';
    });
    html+='</div>';
  });
  listEl.innerHTML=html;
};

window.loadProject=function(nr){
  var allProjects=JSON.parse(localStorage.getItem('boorpunt_projects')||'{}');
  var proj=allProjects[nr];
  // Fallback: zoek op projectNr als key niet gevonden
  if(!proj){
    Object.keys(allProjects).forEach(function(k){
      if(!proj&&allProjects[k].projectNr===nr) proj=allProjects[k];
    });
  }
  if(!proj||!proj.boreholes){alert('Project niet gevonden: '+nr);return;}
  console.log('Loading project:',nr,'boreholes:',proj.boreholes.length,'klic:',proj.klicLayers?proj.klicLayers.length:0);
  // Clear current data
  ms.forEach(function(m){map.removeLayer(m);});
  ls.forEach(function(l){map.removeLayer(l);});
  ms=[];ls=[];data.splice(0,data.length);addedPoints.splice(0,addedPoints.length);

  // First pass: build data array for color scale
  proj.boreholes.forEach(function(b){
    var ll=rd(b.x,b.y);
    data.push({n:b.n,x:b.x,y:b.y,d:b.d,dia:b.dia||0,lat:ll[0],lng:ll[1],custom:b.custom||false,type:b.type||''});
  });
  // Build color scale BEFORE creating markers so cc() works correctly
  buildColorScale();

  // Second pass: create markers with correct colors
  data.forEach(function(item){
    attachPointLayers(item,'#fff');
  });
  grp=L.featureGroup(ms);
  if(ms.length>0) map.fitBounds(grp.getBounds().pad(0.12));
  refreshPointDataViews();
  // Restore KLIC layers if saved
  if(proj.klicLayers&&proj.klicLayers.length>0){
    restoreKlicLayers(proj.klicLayers);
  }
  currentProjectNr=proj.projectNr||nr;
  currentKlant=proj.klant||'';
  document.getElementById('projectNr').value=currentProjectNr;
  var klantEl=document.getElementById('klantNaam');
  if(klantEl) klantEl.value=currentKlant;
  var label=currentKlant?(currentKlant+' / '+currentProjectNr):currentProjectNr;
  var klicInfo=proj.klicLayers&&proj.klicLayers.length>0?' + KLIC lagen':'';
  document.getElementById('projectStatus').textContent='\u2705 Project '+label+' geladen ('+data.length+' punten'+klicInfo+')';
  document.getElementById('projectStatus').style.color='#2e7d32';
  document.getElementById('projectList').style.display='none';
};

window.deleteProject=function(){
  var nr=document.getElementById('projectNr').value.trim();
  var klant=document.getElementById('klantNaam')?document.getElementById('klantNaam').value.trim():'';
  if(!nr){alert('Vul een projectnummer in');return;}
  var projectKey=klant?(klant+'__'+nr):nr;
  var label=klant?(klant+' / '+nr):nr;
  if(!confirm('Project "'+label+'" verwijderen?')) return;
  var allProjects=JSON.parse(localStorage.getItem('boorpunt_projects')||'{}');
  delete allProjects[projectKey];
  localStorage.setItem('boorpunt_projects',JSON.stringify(allProjects));
  if(window.__supabaseSave){
    window.__supabaseSave('project_'+projectKey,null);
    window.__supabaseSave('projects_index',Object.keys(allProjects));
  }
  document.getElementById('projectStatus').textContent='Project '+label+' verwijderd';
  document.getElementById('projectStatus').style.color='#c62828';
};

// === DROPBOX EXPORT ===
window.exportDropbox=function(){
  var nr=document.getElementById('projectNr')?document.getElementById('projectNr').value.trim():'';
  if(!nr){alert('Vul eerst een projectnummer in bij Project');return;}
  if(data.length===0){alert('Geen boorpunten om te exporteren');return;}
  var statusEl=document.getElementById('projectStatus');
  statusEl.textContent='Dropbox: map aanmaken...';statusEl.style.color='#0061fe';

  var klant=document.getElementById('klantNaam')?document.getElementById('klantNaam').value.trim():'';
  var folderPath=klant?('/Ground Research/'+klant+'/'+nr):('/Ground Research/'+nr);

  // 1. Create folder
  fetch('/api/dropbox/upload',{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({folderPath:folderPath})
  }).then(function(r){return r.json();}).then(function(res){
    if(res.error){statusEl.textContent='Dropbox fout: '+res.error;statusEl.style.color='#c62828';return;}

    // 2. Export CSV
    var csv='Nr;X;Y;Diepte;Diameter;Type\n';
    data.forEach(function(b){
      csv+=b.n+';'+b.x+';'+b.y+';'+b.d+';'+(b.dia||0)+';'+(b.type||'')+'\n';
    });
    var csvB64=btoa(unescape(encodeURIComponent(csv)));

    statusEl.textContent='Dropbox: boorpunten uploaden...';

    return fetch('/api/dropbox/upload',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        filePath:folderPath+'/boorpunten-'+nr+'.csv',
        fileContent:csvB64,
        fileName:'boorpunten-'+nr+'.csv'
      })
    }).then(function(r){return r.json();});
  }).then(function(res){
    if(!res) return;
    if(res.error){statusEl.textContent='Dropbox fout: '+res.error;statusEl.style.color='#c62828';return;}

    // 3. Export project JSON
    var projectData={
      projectNr:nr,
      boreholes:data.map(function(b){return{n:b.n,x:b.x,y:b.y,d:b.d,dia:b.dia,type:b.type||''};}),
      klicLayers:serializeKlicLayers(),
      exportedAt:new Date().toISOString()
    };
    var jsonB64=btoa(unescape(encodeURIComponent(JSON.stringify(projectData,null,2))));

    statusEl.textContent='Dropbox: projectbestand uploaden...';

    return fetch('/api/dropbox/upload',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        filePath:folderPath+'/project-'+nr+'.json',
        fileContent:jsonB64,
        fileName:'project-'+nr+'.json'
      })
    }).then(function(r){return r.json();});
  }).then(function(res){
    if(!res) return;
    if(res.error){statusEl.textContent='Dropbox fout: '+res.error;statusEl.style.color='#c62828';return;}
    statusEl.textContent='\u2705 Ge\u00ebxporteerd naar Dropbox: '+folderPath;
    statusEl.style.color='#2e7d32';
  }).catch(function(err){
    statusEl.textContent='Dropbox fout: '+err.message;statusEl.style.color='#c62828';
  });
};

} catch(e) {
  if(e && e.__skip) { /* map already loaded, no error */ }
  else {
    var s=document.getElementById('status');
    s.style.display='block';
    s.style.background='#ffebee';
    s.style.color='#c62828';
    s.textContent='FOUT: '+e.message;
  }
}
// PWA Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(function(){});
}
