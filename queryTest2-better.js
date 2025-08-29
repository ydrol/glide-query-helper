// Test JS Query Theory - (A AND B) OR C OR D OR E


function testExpression(e1,e2,e3,e4,e5) {
    
       

    var gr = new GlideRecord('sys_user');

    //var x = gr.addQuery('sys_id','=','ALWAYS_FALSE'); 

    var x = gr.addQuery('sys_id',op[e3],'C');
    x.addOrCondition('sys_id',op[e4],'D');
    x.addOrCondition('sys_id',op[e5],'E');
    x.addOrCondition('sys_id',op[e1],'A').addCondition('sys_id',op[e2],'B');

    gr.setLimit(1);
    gr.query();
    var expect= ( e1 && e2 ) || e3 || e4 || e5;

    var count = gr.getRowCount();

    // Testing the following as a GlideCondition
    gs.info('( ( {0} && {1} ) || {2} || {3} || {4}  : condition test '+(+expect == count ? 'pass':'FAIL'),
         e1,e2,e3,e4,e5 );
    if (+expect != count) {
        gs.info('   \tGlideQueryCondition Failed: rows {0}: expect {1} : query {2}\n', count, expect , gr.getEncodedQuery() );
    }
    
	if(false) {

		// Now see if GlideQuery cn replicate -
		// Expect this to fail as EncodedQuery only have one level of precedence OR > AND.

		// Copy the GlideRecord to test via getEncodedQuery 
		var gr2 = new GlideRecord(gr.getTableName());
		gr2.addEncodedQuery(gr.getEncodedQuery());
		gr2.setLimit(1);
		gr2.query();
		var count2 = gr2.getRowCount();

		if (count2 != count) {
			gs.info('Encoded query mismatch ');
			gs.info('( {0} && ( ( {1} && {2}) || ( {3} && {4} ) ): encodedQuery test '+(count2 == count ? 'pass':'FAIL'),
			e1,e2,e3,e4,e5 );
			gs.info('   \trows {0}: expect {1} : query {2}\n', count2, count , gr.getEncodedQuery() );
		}
	}

}

// Test all combinatations of the expression
gs.info('Test all combinations of ( e1 && ( ( e2 && e3) || ( e4 && e5 ) )');
// 0 will add an always FALSE condition sys_id=ABC
// 1,will add an always TRUE condition sys_id!=ABC
var op={ 0:'=', 1:'!=' };
for (var e1 in op) {
    for (var e2 in op) {
        for (var e3 in op) {
            for (var e4 in op) {
                for (var e5 in op) {
                    testExpression(+e1,+e2,+e3,+e4,+e5);
                }
            }
        }
    }
}

