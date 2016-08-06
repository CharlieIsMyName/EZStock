var axisPeriod=100;   //the max and min value of the axis will be the cloest value of the max and min price that can be divided by #{axisGroup}

var width;
var height;
var padding;




$(
    function(){
        width=$("#graph").width();
        height=$("#graph").height();
        padding=width/30;
        
        
        
        var socket=io.connect();
        var canvas=d3.select("#graph").append("svg")
              .attr("width",width)
              .attr("height",height);
        var colorScale=d3.scale.category20();
        
        function updateGraph(data,min,max){
          var axisDiff=(height-2*padding)/(max-min)*axisPeriod;
          
          canvas.selectAll("*").remove();
          
          
          if(!data.Dates){
            return;
          }
          
          var elements=data.Elements;
          var dx=(width-2*padding)/data.Dates.length;
          
          //we first draw the background
          for(var i=0;i<((max-min)/axisPeriod+1);i++){
            canvas.append("line")
              .attr("x1",padding)
              .attr("x2",width-padding)
              .attr("y1",padding+i*axisDiff)
              .attr("y2",padding+i*axisDiff)
              .attr("stroke-width", 0.5)
              .attr("stroke", "white");
            canvas.append("text")
              .attr("x",padding)
              .attr("y",padding+i*axisDiff)
              .text((max-i*axisPeriod))
              .attr("font-size",10)
              .attr("fill","white")
          }
          
          for(i=0;i<elements.length;i++){
            var values=elements[i].DataSeries.close.values;
            
            while(values.length<data.Dates.length){
              elements[i].DataSeries.close.values.unshift(0);
              values.unshift(0);
            }
            
            canvas.selectAll("#"+elements[i].Symbol)
              .data(values)
              .enter()
                .append("line")
                  .attr("x1",function(d,index){return padding+index*dx})
                  .attr("y1",function(d){return height-padding-(height-2*padding)/(max-min)*(d-min)})
                  .attr("x2",function(d,index){
                    if(index==values.length-1){
                      return padding+index*dx
                    }
                    return padding+(index+1)*dx;
                  })
                  .attr("y2",function(d,index){
                    if(index==values.length-1){
                      return height-padding-(height-2*padding)/(max-min)*(d-min);
                    }
                    return height-padding-(height-2*padding)/(max-min)*(values[index+1]-min)
                  })
                  .attr("stroke-width", 2)
                  .attr("stroke", function(){return colorScale(elements[i].Symbol)});
                  
          }
          
          /*build the data for day bar.
          daybar={
            date : date,
            stat : [
              {
                symbol: s,
                value: v
              }
            ]
          }          
          */
          var dayData=[];
          for(var i=0;i<data.Dates.length;i++){
            var value={
              date: data.Dates[i],
              stat: []
            }
            
            for(var j=0;j<data.Elements.length;j++){
              value.stat.push({
                symbol: data.Elements[j].Symbol,
                value: elements[j].DataSeries.close.values[i]
              });
            }
            dayData.push(value);
          }
          
          
          //add day bars
          canvas.selectAll("#dayBar")
          .data(dayData)
          .enter()
            .append("rect")
            .attr('x',function(d,i){return padding+i*dx})
            .attr('y',padding)
            .attr('width',dx)
            .attr('height',height-2*padding)
            .attr('fill','white')
            .attr('opacity',0)
            .on('mouseover',function(d,i){
              canvas.append('line')
                .attr('x1',padding+i*dx)
                .attr('y1',padding)
                .attr('x2',padding+i*dx)
                .attr('y2',height-padding)
                .attr('class','traceline')
                .attr("stroke-width", 1)
                .attr("stroke", "white");
              
              var mousePos=d3.mouse(this);
              
              var tooltip=d3.select('#graph').append('div')
                .attr('class','mytooltip')
                .style('left',(mousePos[0]+50)+'px')
                .style('top',mousePos[1]+'px')
              
              tooltip.append('div')
                .attr('class','mytooltipdate')
                .text(d.date);
              for(var i=0;i<d.stat.length;i++){
                
                var line=tooltip.append('div')
                .attr('class','mytooltipline');
                
                line.append('div')
                .attr('class','myindicator')
                .style('background-color',colorScale(d.stat[i].symbol))
                
                line.append('div')
                .attr('class','mytooltiptext')
                .text(d.stat[i].symbol+" : "+d.stat[i].value);
              }
                
              
            })
            .on('mouseleave',function(d,i){
              canvas.selectAll('.traceline').remove();
              d3.selectAll(".mytooltip").remove();
            })
        }
        
        
        
        socket.on('data',function(data){
          $("#codes").empty();
          var allPoints=[];
          data.Elements.forEach(function(d){
            
            var newElement=$("<div class='well col-md-2 text-center codeTag' data-toggle='tool-tip' title="+"'Click To Delete "+d.Symbol+"'>"+d.Symbol+"</div>");
            
            newElement.css("background-color",colorScale(d.Symbol));
            
            newElement.click(function(){
              socket.emit("remove",d.Symbol);
            });
            
            $("#codes").append(newElement);
            allPoints=allPoints.concat(d.DataSeries.close.values);
          });
          var max=0;
          var min=100000000;
          allPoints.forEach(function(value){
            if(value>max){
              max=value;
            }
            if(value<min){
              min=value;
            }
          });
          
          
          max=Math.floor(max/axisPeriod)*axisPeriod+axisPeriod;
          if(min<axisPeriod){
            min=0;
          }
          else{
            min=Math.ceil(min/axisPeriod)*axisPeriod-axisPeriod;
          }
          
          //after we have all the information, we will update the graph
          updateGraph(data,min,max);
          
        })
        
        
        $("#newCodeSubmit").click(function(){
            socket.emit("newCode",$("#newCode").val());
            $("#newCode").val("");
        });
        $("#form").submit(function(e){
            e.preventDefault();
            socket.emit("newCode",$("#newCode").val());
            $("#newCode").val("");
        });
        
    }
)
