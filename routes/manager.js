var express = require('express');
const Organization = require('../Model/Organization');
const User = require('../Model/User');
var router = express.Router();
var bcrypt = require('bcrypt');
const Department = require('../Model/Department');
const Leave = require('../Model/Leave');
var mongoose = require("mongoose");
const LeaveType = require('../Model/LeaveType');
/* GET users listing. */


router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});
router.get("/dashboard",async (req,res)=>{
  if(req.session.userId){
    console.log(req.session.userId)
    const user = await User.findOne({_id:req.session.userId}).populate('department','name',Department).populate('organization','name',Organization);
    var t= new Date();
    var stdate = t.setDate(t.getDate()-15)
    var endate = t.setDate(t.getDate()+30)
    const absenties = await Leave.find({$and:[{startingdate:{$lte:endate}},{endingdate:{$gte:stdate}}]}).populate('user_id','name',User).select('user_id.name startingdate endingdate reason');
    console.log(absenties)
    // var q=[]
    // absenties.forEach(x=>{q.push(x._id)
    // })
    //const others = await User.findOne({$and:[{organization:user.organization},{$not:{$all:absenties}}]})
    //console.log(others)
    //console.log(absenties)
    //console.log(new ISODate())
    res.cookie('leaves',absenties)
    res.render("./manager/dashboard",{data:user,leaves:absenties,type:"Dashboard"})
  }
  else
  res.redirect('/signin')
})
router.get('/calleaves',async(req,res)=>{
  var t= new Date();
  var stdate = t.setDate(t.getDate()-15)
    var endate = t.setDate(t.getDate()+30)
  const absenties = await Leave.find({$and:[{startingdate:{$lte:endate}},{endingdate:{$gte:stdate}}]}).populate('user_id','name',User).select('user_id.name startingdate endingdate reason');
  res.send({leaves:absenties})
})
router.get("/employee",async (req,res)=>{

  const org = await User.findOne({_id:req.session.userId}).select("organization department");
  
  const data = await User.find({role:"Employee",organization:org.organization,department: org.department}).populate('department','name',Department);
  //console.log(data)
  res.render("./manager/dashboard",{data:data,type:"Employee"})

})

router.post("/employee", async function (req, res, next) {
  //console.log(req.body);
  const user = await User.findOne({_id:req.session.userId});
  const _user = new User({
    name: req.body.name,
    email: req.body.email,
    phoneNumber: req.body.phno,
    password: "test",
    role: "Employee",
    department:user.department,
    organization:user.organization,
    
  });
  const salt = await bcrypt.genSalt(10);
  _user.password = await bcrypt.hash(_user.password, salt);
      
      await _user.save((err, data) => {
        if (err) res.send({ err: err });
        res.redirect("/manager/employee")
      });
  
  
});





router.get("/leaves",async (req,res)=>{
  if(req.session.userId){
    const user = await User.findOne({_id:req.session.userId});
    const leaves = await Leave.aggregate([{
      "$lookup":{
        "from": User.collection.name,
        "localField":"user_id",
        "foreignField":"_id",
        "as":"user_id"
      }},
      {
      "$unwind" : {
        path:"$user_id"
      }},
      {
      "$match":{
          
            $and:[
              {"user_id.organization":user.organization},
              {"user_id.role":'Employee'}
            ]
          
      }}

    ])
    
    console.log(user)
    
    res.render("./manager/dashboard",{data:leaves,type:"Leaves"})
  }
  else
  res.redirect('/signin')
})

  
router.post('/leave/request',async (req,res)=>{
  console.log(req.body);
})
router.get('/leave/approve/:id',async(req,res)=>{
  console.log(req.params)
  await Leave.findOneAndUpdate({_id:mongoose.Types.ObjectId(req.params.id)},{status:"Approved"}) 
  res.redirect("/manager/leaves")
})
router.get('/leave/reject/:id',async(req,res)=>{
  console.log(req.params)
  await Leave.findOneAndUpdate({_id:mongoose.Types.ObjectId(req.params.id)},{status:"Rejected"}) 
  res.redirect("/manager/leaves")
})

router.get("/reqleave",async (req,res)=>{
  if(req.session.isAuth){
    console.log(req.cookies.user)
    const user = await User.findOne({_id:req.session.userId});
  
    const leave = await Organization.findOne({_id:mongoose.Types.ObjectId(user.organization)}).populate('availableleaves','_id name',LeaveType)
    
    const pastleave = await Leave.find({user_id:mongoose.Types.ObjectId(req.session.userId)}).sort('startingdate').populate('leavetype','name',LeaveType);
   
    res.render("manager/dashboard",{data:user,leavetype:leave.availableleaves,pastleave:pastleave,type:"reqLeaves"})
  }
  else
  res.redirect('/signin')
})
router.post('/reqleave/request',async (req,res)=>{
  console.log(req.body);
  
  const user = await User.findOne({_id:mongoose.Types.ObjectId(req.session.userId)});
  console.log(user)
  const _leave = new Leave({...req.body,user_id:req.session.userId,organization:user.organization,department:user.department})
  _leave.save((err,data)=>{
    if(err) res.send({err:err});
    else
      res.redirect('/manager/reqleave')

  })
})
module.exports = router;