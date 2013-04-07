var CodeManager = function(list){
  this.list = list;
  var map = this.map = {};
  for(var i=0,l=list.length;i<l;++i){
    var row = list[i];
    map[row.key] = row.label;
  }
};
CodeManager.prototype = {
  getLabel: function(key){
    return this.map[key];
  },
  getList: function(){
    return this.list;
  }
};

var WorkTimeRecord = function(code, phase, activity, remark){
  this.record = {
    code: code,
    phase: phase,
    activity: activity,
    remark: remark
  };
};
WorkTimeRecord.prototype = {
  setData: function(record){
    this.record = record;
  },
  getData: function(){
    return this.record;
  },

  eq: function(rec2){
    if(!rec2) return false;
    rec2 = rec2.getData();
    var rec = this.record;
    var result = true;
    result &= (rec.code === rec2.code);
    result &= (rec.phase === rec2.phase);
    result &= (rec.activity === rec2.activity);
    result &= (rec.remark === rec2.remark);
    return result;
  },

  toString: function(){
    var record = this.record;
    var text = "";
    text += record.code ? "[" + record.code + "]" : "";
    text += record.phase ? " " + phaseCodeMgr.getLabel(record.phase) : "";
    text += record.activity ? " - " + activityCodeMgr.getLabel(record.activity) : "";
    text += record.remark ? " (" + record.remark + ")" : "";
    return text;
  }
};

var SlotSelector = function(slotsSize){
  this.slotsSet = [];
  this.slotsSize = slotsSize;
  this.selecting = false;
  this.beginIndex;
  this.currentSlots;
};
SlotSelector.prototype = {
  createSlots: function(){
    var slots = new Array(this.slotsSize);
    for(var i=0,l=slots.length;i<l;++i){
      slots[i] = false;
    }
    return slots;
  },

  isSelecting: function(){
    return this.selecting;
  },
  startSelect: function(index){
    this.selecting = true;
    this.beginIndex = index;
    this.currentSlots = this.createSlots();
    this.slotsSet.push(this.currentSlots);
    this.selectSlot(index);
  },
  endSelect: function(){
    this.selecting = false;
  },
  selectSlot: function(index){
    this.currentSlots[index] = true;
  },
  unselectSlot: function(index){
    this.currentSlots[index] = false;
  },
  selectRange: function(beginIndex, endIndex){
    var b = Math.min(beginIndex, endIndex);
    var e = Math.max(beginIndex, endIndex);
    for(var i=0,l=this.currentSlots.length;i<l;++i){
      if(i >= b && i <= e){
        this.selectSlot(i);
      }
      else{
        this.unselectSlot(i);
      }
    }
  },
  selectTo: function(endIndex){
    this.selectRange(this.beginIndex, endIndex);
  },
  clear: function(){
    this.slotsSet = [];
  },
  getSlots: function(){
    var result = this.createSlots();
    for(var i1=0,l1=this.slotsSet.length;i1<l1;++i1){
      var slots = this.slotsSet[i1];
      for(var i2=0,l2=slots.length;i2<l2;++i2){
        if(slots[i2]){
          result[i2] = true;
        }
      }
    }
    return result;
  }
  
};

var TimeCard = function(){
  this.slotsSize = 24*4;
  this.slots = new Array(this.slotsSize);
  this.hFirst = 0;
  this.sSpan = 15;
  this.sNum = 4;

  this.breakTimes = [];
  var bt = ["12:00", "12:15", "12:30"];
  for(var i=0,l=bt.length; i<l; ++i) this.breakTimes.push(this.getSlotIndexFromTimeString(bt[i]));
};
TimeCard.prototype = {

  getTimeStringFromSlotIndex: function(i){
    i = i % this.slotsSize;
    var h = (Math.floor(i / this.sNum) + this.hFirst) % 24;
    var s = i % this.sNum * this.sSpan;
    var hStr = ("00"+h).slice(-2);
    var sStr = ("00"+s).slice(-2);
    return hStr + ":" + sStr;
  },

  getSlotIndexFromTimeString: function(s){
    var tmp = s.split(":");
    if(tmp.length != 2) return -1;
    var h = parseInt(tmp[0]), s = parseInt(tmp[1]);
    if(isNaN(h) || isNaN(s)) return -1;
    if(this.hFirst > h) h += 24;
    return (h - this.hFirst) * this.sNum + Math.floor(s / this.sSpan);
  },

  // IE8 is not supported: Array.prototype.indexOf
  isBreakTime: function(slotIndex){
    var bt = this.breakTimes;
    for(var i=0,l=bt.length; i<l; ++i){
      if(bt[i] === slotIndex) return true;
    }
    return false;
  },

  isWorkTime: function(slotIndex){
    return (! this.isBreakTime(slotIndex));
  },

  setRecords: function(slots, rec){
    for(var i=0,l=slots.length; i<l; ++i){
      if(this.isWorkTime(i) && slots[i]){
        this.setRecord(i, rec);
      }
    }
  },

  setRecord: function(index, rec){
    this.slots[index] = rec;
  },

  deleteRecords: function(slots, rec){
    for(var i=0,l=slots.length; i<l; ++i){
      if(this.isWorkTime(i) && slots[i]){
        this.deleteRecord(i, rec);
      }
    }
  },

  deleteRecord: function(index){
    this.slots[index] = null;
  },

  readRecords: function(records){
    for(var i=0,l=records.length;i<l;++i){
      this.readRecord(records[i]);
    }
  },

  readRecord: function(row){
    var begin = row.begin;
    var end = row.end;
    for(var i=begin;i<=end;++i){
      this.setRecord(i, row.record);
    }
  },

  getRecord: function(index){
    return this.slots[index];
  },

  getRecords: function(){
    var slots = this.slots;
    var result = [];
    var beginIndex;
    var current;
    for(var i=0,l=slots.length; i<l; ++i){
      var tmp = slots[i];
      if(!current){
        beginIndex = i;
        current = tmp;
        continue;
      }
      if(this.isBreakTime(i) || !current.eq(tmp)){
        result.push({
            begin: beginIndex,
            end: i - 1,
            record: current
        });
        beginIndex = i;
        current = tmp;
      }
    }
    if(current){
      result.push({
          begin: beginIndex,
          end: slots.length - 1,
          record: current
      });
    }
    return result;
  },

  clearRecords: function(){
    this.slots = new Array(this.slotsSize);
  }

};

var CsvGenerator = function(sep){
  this.sep = sep || ",";
};
CsvGenerator.prototype = {
  process: function(records, cb){
    var buf = [];
    for(var i=0,l=records.length;i<l;++i){
      var row = cb ? cb(records[i]) : records[i];
      buf.push(this.processRow(row));
    }
    return buf.join("\n");
  },

  processRow: function(row){
    var buf = [];
    for(var i=0,l=row.length;i<l;++i){
      buf.push(this.processCol(row[i]));
    }
    return buf.join(this.sep);
  },

  processCol: function(col){
    if(! col) return null;
    col = col.replace(/"/g, "\"\"");
    col = "\"" + col + "\"";
    return col;
  }
};

var phaseCodeMgr = new CodeManager(window.PhaseMaster || []);
var activityCodeMgr = new CodeManager(window.ActivityMaster || []);

$(function(){

    var timeCardMgr = new TimeCard();
    var slotSelector = new SlotSelector(timeCardMgr.slotsSize);
    var $pieces = [];
    var onTimeCard = false;
    var onShift = false;
    var onCtrl = false;
    var currentDate = new Date();
    var history = [];
    var codes = [];

    $timecardPanel = $("#timecard");
    $timecard = $("#timecardSlots");
    $fgLayer = $("#timecardFgLayer");
    $paintLayer = $("#timecardPaintLayer");
    $bgLayer = $("#timecardBgLayer");
    $timeline = $("#timeline");
    
    for(var i=0,l=timeCardMgr.slotsSize;i<l;++i){
      var $piece = createFgPiece(i);
      $fgLayer.append($piece);
      $pieces.push($piece);

      $bgLayer.append(createBgPiece(i));

      if(i % 4 === 0){
        var $label = $("<div></div>").addClass("timelabel");
        $label.append(timeCardMgr.getTimeStringFromSlotIndex(i));
        $timeline.append($label);
      }
    }

    var $topPiece = $pieces[timeCardMgr.getSlotIndexFromTimeString("07:00")];
    $timecardPanel.scrollTop($topPiece[0].offsetTop - 10);

    setUpCombo($("#phase"), phaseCodeMgr);
    setUpCombo($("#activity"), activityCodeMgr);

    $timecardPanel.on("mouseenter", enterTimeCard);
    $timecardPanel.on("mouseleave", leaveTimeCard);

    $(window).on("mouseup", function(){
        if(slotSelector.isSelecting()){
          slotSelector.endSelect();
        }
    });
    $(window).on("keydown", function(e){
        if(!onTimeCard) return;
        switch(e.which){
          case 16:  // Shift
          onShift = true;
          break;
          case 17:  // Ctrl
          onCtrl = true;
          break;
          case 46:  // Delete
          deleteWorkRecord();
          break;
        }
    });
    $(window).on("keyup", function(e){
        switch(e.which){
          case 16:  // Shift
          onShift = false;
          break;
          case 17:  // Ctrl
          onCtrl = false;
          break;
        }
    });
    var t1;
    $(window).on("resize", function(e){
        if(t1){
          clearTimeout(t1);
        }
        t1 = setTimeout(refreshView, 50);
    });

    // input form
    $("#write").on("click", writeWorkRecord);
    $("#delete").on("click", deleteWorkRecord);
    $("#code").typeahead({
        source: codes
    });
    $("#history").on("click", function(){
        var val = $("#history").val();
        if(val !== ""){
          var rec = history[val];
          var slots = slotSelector.getSlots();
          timeCardMgr.setRecords(slots, rec);
          refreshView();
        }
    });

    // menubar
    $("#genTsv").on("click", generateWorkRecordTsv);
    $("#save").on("click", saveData);
    $("#clear").on("click", removeData);

    $("#date").datepicker().datepicker("setValue", currentDate);
    $("#date").on("changeDate", function(e){
        $("#date").datepicker("hide");
        currentDate = e.date;
        readData();
    });

    // initial load
    readHistory();
    readData();

    function enterTimeCard(){
      onTimeCard = true;
    }
    function leaveTimeCard(){
      onTimeCard = false;
    }

    function setUpCombo($target, codeMgr){
      var list = codeMgr.getList();
      for(var i=0,l=list.length;i<l;++i){
        var row = list[i];
        var $option = $("<option></option>").attr("value", row.key).text(row.label);
        $target.append($option);
      }
    }

    function createFgPiece(i){
      var $div = $("<div></div>");
      $div.addClass("piece");
      if(i === 0){
        $div.addClass("piece-fst");
      }
      else if(i % 4 == 0){
        $div.addClass("piece-whole");
      }
      else if(i % 2 == 0){
        $div.addClass("piece-half");
      }
      if(timeCardMgr.isBreakTime(i)){
        $div.addClass("piece-break");
      }
      $div.on("mousedown", { index: i }, onPieceMouseDown);
      $div.on("mouseover", { index: i }, onPieceMouseOver);
      return $div;
    }

    function createBgPiece(i){
      var $div = $("<div></div>");
      $div.addClass("piece");
      if(i === 0){
        $div.addClass("piece-fst");
      }
      else if(i % 4 == 0){
        $div.addClass("piece-whole");
      }
      else if(i % 2 == 0){
        $div.addClass("piece-half");
      }
      return $div;
    }

    function refreshView(){
      // foreground layer
      var slots = slotSelector.getSlots();
      for(var i=0,l=slots.length;i<l;++i){
        if(slots[i]){
          $pieces[i].addClass("piece-selected");
        }
        else{
          $pieces[i].removeClass("piece-selected");
        }
      }

      // paint layer
      var records = timeCardMgr.getRecords();
      $paintLayer.empty();
      for(var i=0,l=records.length;i<l;++i){
        var row = records[i];
        paintWorkRecord(row.begin, row.end, row.record);
      }

      // background layer
      $bgLayer.width($fgLayer.width());
    }

    function getRecordColorClass(record){
      var activity = record.getData().activity;
      return "piece-record-color" + (activity % 4 + 1);
    }
    function getRecordFontClass(beginIndex, endIndex){
      var d = Math.abs(endIndex - beginIndex);
      if(d < 1){
        return "piece-record-font-small";
      }
      else if(d < 4){
        return "piece-record-font-medium";
      }
      else{
        return "piece-record-font-large";
      }
    }
    function paintWorkRecord(beginIndex, endIndex, record){
      var $bSlot = $pieces[beginIndex];
      var $eSlot = $pieces[endIndex];
      var top = $bSlot[0].offsetTop - 1; // border-top-width: 1px
      var bottom = $eSlot[0].offsetTop + $eSlot.height() - 1;
      // panel
      var $div = $("<div></div>").addClass("piece-record").addClass(getRecordColorClass(record));
      $div.width($timecard.width()).height(bottom - top).css({top: top});
      $paintLayer.append($div);
      // inner text
      var $text = $("<p></p>").addClass(getRecordFontClass(beginIndex, endIndex));
      $text.text(record.toString());
      $div.append($text);
    }

    function writeWorkRecord(){
      var rec = getFormData();
      var slots = slotSelector.getSlots();
      timeCardMgr.setRecords(slots, rec);
      refreshView();
    }

    function deleteWorkRecord(){
      var slots = slotSelector.getSlots();
      timeCardMgr.deleteRecords(slots);
      refreshView();
    }

    function generateWorkRecordTsv(){
      var records = timeCardMgr.getRecords();
      var tsv = new CsvGenerator("\t").process(records, function(row){
          var buf = [];
          var record = row.record.getData();
          buf.push(getYMDString(currentDate));
          buf.push(timeCardMgr.getTimeStringFromSlotIndex(row.begin));
          buf.push(timeCardMgr.getTimeStringFromSlotIndex(row.end + 1));
          buf.push(record.code);
          buf.push(phaseCodeMgr.getLabel(record.phase));
          buf.push(activityCodeMgr.getLabel(record.activity));
          buf.push(record.remark);
          return buf;
      });
      $("#tsv").val(tsv);
      $("#tsvModal").modal();
    }

    function onPieceMouseDown(e){
      var index = e.data.index;
      if(onShift){
        slotSelector.selectTo(index);
      }
      else if(onCtrl){
        slotSelector.startSelect(index);
      }
      else{
        slotSelector.clear();
        slotSelector.startSelect(index);
        // set to form
        setFormData(timeCardMgr.getRecord(index));
      }
      enterTimeCard();
      refreshView();
      e.preventDefault();
      e.stopPropagation();
    }

    function onPieceMouseOver(e){
      if(slotSelector.isSelecting()){
        var index = e.data.index;
        slotSelector.selectTo(index);
        refreshView();
      }
    }

    function setFormData(rec){
      if(rec){
        var data = rec.getData();
        $("#code").val(data.code);
        $("#phase").val(data.phase);
        $("#activity").val(data.activity);
        $("#remark").val(data.remark);
      }
    }

    function getFormData(rec){
      var code = $("#code").val();
      var phase = $("#phase").val();
      var activity = $("#activity").val();
      var remark = $("#remark").val();
      return rec = new WorkTimeRecord(code, phase, activity, remark);
    }

    function getYMDString(dt, sep){
      sep = sep || "";
      var y = dt.getYear();
      var m = dt.getMonth();
      var d = dt.getDate();
      y = (y < 1900) ? (y + 1900) : y;
      m += 1;
      var yyyy = ("0000" + y).slice(-4);
      var mm = ("00" + m).slice(-2);
      var dd = ("00" + d).slice(-2);
      return yyyy + sep + mm + sep + dd;
    }


    function serialize(records){
      var buf = [];
      for(var i=0,l=records.length;i<l;++i){
        var row = records[i];
        buf.push({
            begin: row.begin,
            end: row.end,
            data: row.record.getData()
        });
      }
      return JSON.stringify(buf);
    }

    function deserialize(s){
      var buf = [];
      var records = JSON.parse(s);
      for(var i=0,l=records.length;i<l;++i){
        var row = records[i];
        var record = new WorkTimeRecord();
        record.setData(row.data);
        buf.push({
            begin: row.begin,
            end: row.end,
            record: record
        });
      }
      return buf;
    }

    function getSaveDataKey(date){
      date = date || currentDate;
      return "data_" + getYMDString(date);
    }

    function saveData(){
      if(confirm("保存します。よろしいですか？")){
        var key = getSaveDataKey();
        var data = serialize(timeCardMgr.getRecords());
        localStorage.setItem(key, data);
        readHistory();
      }
    }

    function readData(){
      var key = getSaveDataKey();
      var data = localStorage.getItem(key);
      timeCardMgr.clearRecords();
      if(data){
        timeCardMgr.readRecords(deserialize(data));
      }
      refreshView();
    }

    function removeData(){
      if(confirm("削除します。よろしいですか？")){
        var key = getSaveDataKey();
        localStorage.removeItem(key);
        timeCardMgr.clearRecords();
        refreshView();
        readHistory();
      }
    }

    function readHistory(){
      var dt = new Date();
      var nowTime = dt.getTime();
      var limit = 14;
      var secPerDay = 24*60*60*1000;

      var bufCode = {};
      var bufHistory = {};

      for(var i=0;i<limit;++i){
        dt.setTime(nowTime - secPerDay * i);
        var key = getSaveDataKey(dt);
        var s = localStorage.getItem(key);
        if(s){
          var data = deserialize(s);
          for(var i2=0,l2=data.length;i2<l2;++i2){
            var row = data[i2];
            var record = row.record;
            var code = record.getData().code;
            var text = record.toString();
            bufCode[code] = record;
            bufHistory[text] = record;
          }
        }
      }

      codes = [];
      history = [];

      for(var k in bufCode){
        if(k){
          codes.push(k);
        }
      }
      for(var k in bufHistory){
        if(k){
          history.push(bufHistory[k]);
        }
      }

      // replace source
      var tp = $("#code").data("typeahead");
      tp.source = codes;

      var $history = $("#history").empty();
      $("<option></option>").appendTo($history);
      for(var i=0,l=history.length;i<l;++i){
        $("<option></option>").attr("value", i).text(history[i].toString()).appendTo($history);
      }

    }

});

