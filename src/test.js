< !DOCTYPE html >
    <html>
        <head>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
        </head>
        <body>
            <div id="test"></div>
            <script>
        // Simple D3 test
                d3.select("#test")
                .append("svg")
                .attr("width", 100)
                .attr("height", 100)
                .append("circle")
                .attr("cx", 50)
                .attr("cy", 50)
                .attr("r", 40)
                .style("fill", "blue");
            </script>
        </body>
    </html>