//ES6+

var ScriptUtils_QueryParser = Class.create();
ScriptUtils_QueryParser.prototype = /** @lends ScriptUtils_QueryParser.prototype */ {
    initialize: function() {
    },

    /*

    select (datediff (field) + 1 => DBFunction

    var expr = new GlideDBFunctionBuilder() 
    .andFunc() 
        .compare().field('first_name').constant('=').constant('John').endfunc() 
        .compare().field('active').constant('=').constant(1).endfunc() 
    .endfunc() 
    .build(); 


    gs.info("Expression: " + expr);

    field = 
    addQuery('field','op','value')


select * , extra.field , 
NUMBER
STRING
FIELDNAME
FUNCTION

( FIELD OP VALUE  )




    */
    parseQueryExp: function(queryExpression,start,end) {

        let stream = queryExpression;
        let streamPos = 0;

        function skipSpace() {
            let p = stream.search(/\S/);
            if (p) {
                stream = stream.slice(p);
            }
        }
        function getToken() {
            skipSpace();
            if ()
            
        } 
        let exp = pa



    },
    parseSelectExp: function(selectExpression) {

    }
    type: "ScriptUtils_QueryParser"
}