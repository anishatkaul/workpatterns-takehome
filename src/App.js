import React, {Component} from 'react';
import Table from 'react-bootstrap/Table';
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from 'react-bootstrap/Tooltip';
import './App.css';


class App extends Component {

  /**
     * Generate header row for the email response table
     * Columns are determined by the months represented in the email data
     * @param {[string]} columns - {"month, year"}
     */
  generateHeader(columns) {
    let headers = [<th></th>];
    for (var i=0; i< columns.length; i++){
      headers.push(<th key={"header "+i}>{columns[i]}</th>);
    }
    return headers;
  }

  /**
     * Generate rows for the email response table
     * 
     * @param {number} noColumns
     *  number of columns in the table (number of months represented)
    */
  generateRows(noColumns, avgResponseTimes) {
    let rows = [];
    let sumList = new Array(noColumns).fill(0);
    let rowCount = 0;
    for (var org in avgResponseTimes){
      const orgResponseTimes = avgResponseTimes[org];

      //Keep track of sums for our "All" row
      sumList = sumList.map(function (num, index) {
        return num + orgResponseTimes[index];
      });

      //Create a row for each organization
      const renderRow = this.renderRow(org, orgResponseTimes)
      if (renderRow != null){
        rowCount +=1;
        rows.push(<tr key={org}>{renderRow}</tr>)
      }
      
    }
    //Calculate our averages by month
    var overallAvgs = sumList.map(function (num, index) {
      return num/rowCount;
    })
    //Add our "All" row to the top of the rows array
    const topRow = this.renderRow("All", overallAvgs);
    rows.unshift(topRow);
    return rows;
  }

  /**
   * 
   * @param {Object} avgResponseTimes 
   *  keys: organization names
   *  values: Array of averages of response times by month
   * @param {Object} emailList 
   *  keys: organization names
   *  values: {"sent":[Array of message id's], "received":[Array of message id's]}
   */
  generateNoReplyRows(avgResponseTimes, emailList){
    let rows = [];
    for (var org in avgResponseTimes){
      const orgResponseTimes = avgResponseTimes[org]
      const sum = orgResponseTimes.reduce((a, b) => a + b, 0)
      if (sum===0){
        const noRecieved = emailList[org]["received"].length
        if (noRecieved===0){
          continue;
        }
        const noSent = emailList[org]["sent"].length
        rows.push(<tr><td>{org}</td><td>{noRecieved}</td></tr>)
      }
    }
    return rows;
  }

  /**
   * 
   * @param {string} orgName 
   * @param {Object} orgResponseTimes 
   */
  renderRow(orgName, orgResponseTimes) {
    if (orgName === "workpatterns"){
      return null;
    }
    const sum = orgResponseTimes.reduce((a, b) => a + b, 0)
    if (sum===0){
      return null;
    }
    let row = [<td key={orgName}>{orgName}</td>];
    for (var i=0; i<orgResponseTimes.length; i++){
      const time = orgResponseTimes[i];
      let displayTime;
      if (time == null){
        displayTime = "";
      }
      else if (time>24){
        displayTime = (time/24).toFixed(2) + " days";
      }
      else {
        displayTime = time.toFixed(2) + " hours";
      }
      row.push(<td key={orgName+i}>{displayTime}</td>);
    }
    return row;
  }

  /**
   * 
   * @param {Array} columns 
   * @param {Object} avgResponseTimes 
   *  keys: organization name
   *  values: Array of average response times, by month
   */
  drawTable(columns, avgResponseTimes) {
    return (
    <Table striped bordered hover id="workpatterns">
  <thead>
    <tr>
      {this.generateHeader(columns)}
    </tr>
  </thead>
  <tbody>
    {this.generateRows(columns.length, avgResponseTimes)}
  </tbody>
</Table>
    );
  }

  /**
   * 
   * @param {Object} avgResponseTimes  
   *  keys: organization name
   *  values: Array of average response times, by month
   * @param {Object} emailList 
   *  keys: organization name
   *  values: {"sent": [Array of message id's], "received":[Array of message id's]}
   */
  drawNoResponseTable(avgResponseTimes, emailList){
    console.log("in draw no response table")
    return (
      <Table striped bordered hover id="workpatterns">
        <thead>
          <tr>
            <th> Organization Name</th>
            <th> Number of Times Contacted</th>
          </tr>
        </thead>
        <tbody>
        {this.generateNoReplyRows(avgResponseTimes, emailList)}
        </tbody>
      </Table>

    )
  }

  /**
   * Get the organization name from the param email address
   * @param {string} address 
   */
  getOrgName(address) {
    const at = "@";
    const dot = ".";
    const org_name = address.slice(address.indexOf(at)+1, address.indexOf(dot));
    return org_name;
  }

  /**
   * Get the sending and reciveing organizations from an array of email addresses
   * @param {Array[string]} addresses 
   */
  getOrgsFromEntry(addresses) {
    let sender = null;
    const receivers = [];
    for (var i=0; i<addresses.length; i++){
      const addressEntry = addresses[i];
      const role = addressEntry["role"];
      if (role === "receiver") {
        let orgName = this.getOrgName(addressEntry["address"]);
        if (! receivers.includes(orgName)) {
          receivers.push(orgName)
        }
      }
      else if (role === "sender"){
        let orgName = this.getOrgName(addressEntry["address"]);
        sender = orgName;
      }
    }
    //Clean data of repetition caused by cc'ing internal addresses on outgoing emails
    if (receivers.length > 1) {
      const senderIndex = receivers.indexOf(sender);
      receivers.splice(senderIndex, 1);
    }
    return [sender, receivers];
  }


  /**
   * Analyze email response data
   * @param {Object} emails 
   * 
   */
  analyzeData(emails) {
    const orgs = {};

    //Initialize list of months, to be used for creating table columns
    let columns = [];
    console.log(emails.length)

    // Sort emails by date
    emails.sort(function (a,b) {
      return a["time"] - b["time"];
    });

    // Gather relevant months, years to be used as columns
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    for (let i=0; i<emails.length; i++){
      const date = new Date((emails[i]["time"]*1000));
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const strDate = month + " " + year
      if (! columns.includes(strDate)) {
        columns.push(strDate)
      }
    }

    // Convert email data to single dictionary where keys are message ids, values are the original email data 
    // Enables faster lookups by message ID
    let emailDict = {};
    for (let i=0; i<emails.length; i++) {
      let messageId = emails[i]["message-id"];
      emailDict[messageId] = emails[i];
    }

    for (let i=0; i<emails.length; i++) {
      const entry = emails[i];
      const messageId = entry["message-id"];
      let [sender, receivers] = this.getOrgsFromEntry(entry["addresses"])

      if (sender !== "workpatterns" && ! (receivers.includes("workpatterns"))) {
        continue
      }

      //Handle sender
      if (sender in orgs) {
        orgs[sender]["sent"].push(messageId);
      }
      else {
        orgs[sender] = {"sent":[messageId], "received":[]};
      }

      //Handle recivers
      for (let receiver of receivers) {
        if (receiver in orgs) {
          orgs[receiver]["received"].push(entry);
        }
        else {
          orgs[receiver] = {"sent":[], "received":[entry]};
        }
      }
    }

    // Calculate response times
    let avgResponseTimes = {};

    //Loop through organizations
    var debug;
    for (let org in orgs) {
      if (org === "workpatterns"){
        debug = true;
      }
      else{
        debug = false;
      }
      const emailsSent = orgs[org]["sent"];

      //Initalize vars to calcluate response time averages
      let responseTimeSum = 0;
      let count = 0;
      let colIndex = 0;
      let currMonth = 6;
      let currYear = 2018;
      var monthlyAvgs = new Array(columns.length).fill(null);

      
      //Loop through emails sent from that org to workpatterns
      for (let emailID of emailsSent) {
        const emailSent = emailDict[emailID];
        const prevId = emailSent["in-reply-to"];
        const sentTime = new Date((emailSent["time"]*1000));

        // If the original email that its responding to is also in the data
        if (prevId in emailDict) {
          // Gather and calculate the response time
          const prevEmail = emailDict[prevId];
          const prevDate = (new Date((prevEmail["time"]*1000)));
          if (prevDate.getMonth() !== currMonth || prevDate.getFullYear() !== currYear) {
            // Add our previous running average to our array
            if (count > 0){
              monthlyAvgs[colIndex] = responseTimeSum/count;
            }
            // Reset variables to track the new month's reply times
            count = 0;
            responseTimeSum = 0;
            currMonth = prevDate.getMonth();
            currYear = prevDate.getFullYear()
            if (currMonth <6){
              colIndex = currMonth + 6
            }
            else {
              colIndex = currMonth - 6;
            }
            if (debug){
              console.log("i have an email from ", prevDate)
            }
          }
          //Get reply time in number of hours
          const replyTime = ((sentTime - prevDate)/1000/60/60);
          count +=1;
          responseTimeSum += replyTime;

        } 
        
      }
      // Add our last month's average to the array
      if (count > 0) {
        monthlyAvgs[colIndex] = responseTimeSum/count;
      }
      if (debug){
        console.log("step 5 loop for all, array len is ", monthlyAvgs.length)
      }
      // Add our array of months averages to the overall object tracking the organization's response times
      avgResponseTimes[org] = monthlyAvgs;
    }
    

    
    return [columns, orgs, avgResponseTimes];
  };
  
  
  render(key) {
    const customData = require('./emails.json');
    const [columns, orgs, avgResponseTimes] = this.analyzeData(customData);

    return (
    <div className="App">
      <h1><img src="wp-logo.png" height="80" class="box" alt=""></img>WorkPatterns Email Analysis </h1>
      <h2> Email Response Times<img src="wp-smiley.png" width="35" alt=""></img></h2>
          {this.drawTable(columns, avgResponseTimes)}
      <h2> Non-responsive Organizations <img src="wp-frowney.png" width="35" alt=""></img></h2>
        {this.drawNoResponseTable(avgResponseTimes, orgs)}
      <h3> Take Home Quiz by Anisha Kaul</h3>
      <h3> January 26, 2021 </h3>
    </div>
    );
  }
}

export default App;
