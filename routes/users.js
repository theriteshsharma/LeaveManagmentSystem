var express = require('express');
const Organization = require('../Model/Organization');
const Department =  require('../Model/Department')
const User = require('../Model/User');
var router = express.Router();
var bcrypt = require('bcrypt');
var mongoose = require("mongoose");
const Leave = require('../Model/Leave');
const LeaveType = require('../Model/LeaveType');
/* GET users listing. */


router.get('/', function(req, res, next) {
  res.redirect('/user/dashboard')
});

router.get("/dashboard",async (req,res)=>{
  console.log(req.session.userRole)
  if(req.session.isAuth && req.session.userRole === 'Employee' ){
    //console.log(req.cookies.user)
    const user = await User.findOne({_id:req.session.userId}).populate('department','name',Department);
    const leave = await Leave.find({user_id:req.session.userId}).populate('leavetype','name',LeaveType).limit(5).sort('startingdate');
    var userLeaveCount = await Leave.aggregate([
      {
        $match:{ user_id:mongoose.Types.ObjectId(req.session.userId)}
      },
      {
        $group:{_id:'$leavetype',count: {$sum:1}}
      },
    ])
    //console.log(userLeaveCount)
    const orgLeaves  = await Organization.findOne({_id:user.organization}).select('availableleaves').populate('availableleaves','name count',LeaveType);
    //console.log(orgLeaves)
    var report = [];
    for(let t of userLeaveCount){
      for(let x of orgLeaves.availableleaves)
      { 
        
        if(t._id.equals(x._id)){

          let temp = {name: x.name,used:t.count,total :x.count}
          console.log(temp)
        report.push(temp)
        }
      }
    }
    
    //console.log(leave,req.session.userId);
    res.render("user/dashboard",{data:user,leave:leave,report,type:"Dashboard"})
  }
  else
  res.redirect('/signin')
})


router.get("/leaves",async (req,res)=>{
  if(req.session.isAuth){
    console.log(req.cookies.user)
    const user = await User.findOne({_id:req.session.userId});
  
    const leave = await Organization.findOne({_id:mongoose.Types.ObjectId(user.organization)}).populate('availableleaves','_id name',LeaveType)
    
    const pastleave = await Leave.find({user_id:mongoose.Types.ObjectId(req.session.userId)}).sort('startingdate').populate('leavetype','name',LeaveType);
   
    res.render("user/dashboard",{data:user,leavetype:leave.availableleaves,pastleave:pastleave,type:"Leaves"})
  }
  else
  res.redirect('/signin')
})
router.get("/signin",async (req,res)=>{
  if(req.cookies.user){
    const user = await User.findOne({_id:req.session.userId})
    res.redirect("/user/dashboard")
  }
  else
  res.render('user/signin')
})

//post Request
router.post("/signin", async (req,res)=>{
  
  const {email,password} = req.body
  console.log(req.body)
    const user = User.findOne({email:req.body.email} , async (err,data) => {
      console.log(data,err);
      if(data){
        const validPassword = await bcrypt.compare(password, data.password);
        if(validPassword && data.role==='Employee'){
          res.render('user/dashboard',{data:data,type:"Dashboard"})
        }
      }
      else res.send(JSON.stringify(err))

    })
    //console.log(user);
})
  
router.post('/leave/request',async (req,res)=>{
  console.log(req.body);
  
  const user = await User.findOne({_id:mongoose.Types.ObjectId(req.session.userId)});
  console.log(user)
  const _leave = new Leave({...req.body,user_id:req.session.userId,organization:user.organization,department:user.department})
  _leave.save((err,data)=>{
    if(err) res.send({err:err});
    else
      res.redirect('/user/leaves')

  })
})

module.exports = router;