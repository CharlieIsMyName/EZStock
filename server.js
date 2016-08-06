//-------------------initialization---------------------------
var express=require('express');
var app=express();
var port=process.env.PORT||8080;
var http=require('http');
var request=require('request');
var bodyParser=require("body-parser");

app.set('views',__dirname+"/client");
app.set('view engine','jade');
app.use(express.static(__dirname+"/client"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var code=['GOOGL'];

var period=365;     //number of days to view


//------------------------------------data validation and request module-----------------------
var dataOrigin="http://dev.markitondemand.com/MODApis/Api/v2/InteractiveChart/json?parameters=";

function isJSON(obj){
  try{
    JSON.parse(obj);
  }
  catch(e){
    return false;
  }
  return true;
}

function validCode(c,sender,callback){   //if c actually exist, execute callback function, else do nothing
  //valid code means that it is not in code list and it is an valid stock code
  if(code.find(function(d){return d==c})){
    sender.emit('err','exist');
    return;
  }
  
  var parameters={  
      Normalized: false,
      NumberOfDays: period,
      DataPeriod: "Day",
      Elements: [
        {
          Symbol: c,
          Type: "price",
          Params: ["c"] 
        }
      ]
  };
  
  //make request and check if this code really exist.
  request(dataOrigin+JSON.stringify(parameters),function(err,response,body){
    if(err){
      throw err;
    }
    
    if(isJSON(body)){
      body=JSON.parse(body);
    }
    if(!body.Dates){              //if anything is wrong then there will be no dates
      sender.emit('err','invalid');
    }
    else{
      callback(c,sender,body);
    }
  });
  
}


function update(sender){      //request for the data with the current code array. send the data to all users. send error message to sender if something is wrong(should not happen)
  var parameters={  
      Normalized: false,
      NumberOfDays: period,
      DataPeriod: "Day",
  };
  
  if(code.length==0){
    io.sockets.emit('data',{Elements:[]});
  }
  
  var Elements=[];
  code.forEach(function(c){
    Elements.push(
      {
          Symbol: c,
          Type: "price",
          Params: ["c"] 
      });
  });
  parameters.Elements=Elements;
  
  request(dataOrigin+JSON.stringify(parameters),function(err,response,body){
    if(err){
      throw err;
    }
    
    if(isJSON(body)){
      body=JSON.parse(body);
    }
    if(!body.Dates){      //if anything is wrong then there will be no dates
      sender.emit('err','invalid');
    }
    else{
      io.sockets.emit('data',body);
    }
  });
  
}



//------------------------------rounting---------------------------------
app.get('/',function(req,res){
  res.render('index');
});


//---------------------------------socket.io------------------------------

//setting up socket io server
var server=http.createServer(app);

server.listen(port,function(){
  console.log("socket server ready on "+port);
});

var io=require('socket.io').listen(server,{log:false});

io.sockets.on('connection',function(socket){
  update(socket);
  socket.on('newCode',function(c){
    c=c.toUpperCase();
    validCode(c,socket,function(c,sender,data){
      code.push(c);
      update(sender);
    });
  });
  socket.on('remove',function(c){
    c=c.toUpperCase();
    code.splice(code.indexOf(c),1);
    update(socket);
  })
});

