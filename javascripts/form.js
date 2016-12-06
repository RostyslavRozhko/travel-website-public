$(function () {

    $('#textarea').keyup(function () {
        var max = 200;
        var len = $(this).val().length;
        var char = len;
        $('#cnt').text(char + ' / '+max);
        if(len>max){
        	$('#cnt').css({'color': 'red'});
        }
    });

    $('#name').keyup(function(e){
        if (e.which === 32) {
            $('.leftAlert').show();
        }
        else{
            $('.leftAlert').hide();
        }
    });

    $('#secondname').keyup(function(e){
        if (e.which === 32) {
            $('.rightAlert').show();
        }
        else{
            $('.rightAlert').hide();
        }
    });

});