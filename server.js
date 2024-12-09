import express from "express"

const app = express()

const port = process.env.PORT || 4000

app.get("/", function(req, res){
    res.json({
        message: "success",
        data: "api running"
    })
})

app.get("/other", function(req, res){
    res.json({
        message: "success",
        data: "other is also workin"
    })
})

app.listen(port, function(){
    console.log("the server is running")
})