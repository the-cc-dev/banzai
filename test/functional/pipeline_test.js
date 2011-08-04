var Pipeline = require('../../lib/pipeline')
  , config   = require('../config')
  , assert   = require('assert');

var docs = {
    1: {a:1, b:2, id: 1}
  , 2: {a:3, b:4, id: 2}
  , 3: {a:5, b:6, id: 3}
};

exports.theWholeShebang = function(beforeExit) {
  var loadFunction
    , saveFunction
    , pipeline
    , conditionCalled = false
    , loadFunctionCalled = false
    , saveFunctionCalled = false
    , calledback = false
    , handlerCalled = false
    , initialHandler 
    , aHandler
    , aHandlerCalled = false
    , bHandlerCalled = false
    , stateHandlerCalled = false
    , jobId;
  
  initialHandler = function(doc, done) {
    handlerCalled = true;
    assert.eql({a:3, b:4, id: 2}, doc);
    done(null, doc);
  };
  
  aHandler = function(doc, done) {
    aHandlerCalled = true;
    assert.eql({a:3, b:4, id: 2}, doc);
    done(null, doc);
  };
  
  loadFunction = function(id, done) {
    loadFunctionCalled = true;
    assert.eql(2, id);
    process.nextTick(function() {
      done(null, docs[id]);
    });
  };
  
  saveFunction = function(doc, done) {
    saveFunctionCalled = true;
    process.nextTick(function() {
      assert.eql(2, doc.id);
      docs[doc.id] = doc;
      done(null);
    });
  };
  
  pipeline = new Pipeline('test pipeline', {
      load: loadFunction
    , save: saveFunction
  });
  pipeline
    .use('couch', config.couch_db_uri)
    .on('initial', initialHandler, {
      success: 'a'
    , condition: function(doc) {
        conditionCalled = true;
        return true;
      }
  });

  pipeline.on('a', aHandler, {
      success: 'b'
  });
  
  pipeline.on('b', function() {
    bHandlerCalled = true;
    assert.ok(jobId);
    pipeline.stateFor(jobId, function(err, state) {
      stateHandlerCalled = true;
      assert.equal('b', state);
    })
  });
  
  pipeline.on('error', function() {
    console.log(arguments);
  });
  
  pipeline.push({a:1, b:2, id: 2}, function(err, id) {
    calledback = true;
    assert.isNull(err);
    assert.equal(32, id.length);
    jobId = id;
  });
  
  beforeExit(function() {
    assert.ok(handlerCalled);
    assert.ok(aHandlerCalled);
    assert.ok(bHandlerCalled);
    assert.ok(stateHandlerCalled);
    assert.ok(loadFunctionCalled);
    assert.ok(saveFunctionCalled);
    assert.ok(conditionCalled);
    assert.ok(calledback);
  });
};