$(function() {
  $('a[href*="#"]:not([href="#"])').click(function() {
    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
      if (target.length) {
        $('html, body').animate({
          scrollTop: target.offset().top
        }, 500);
        return false;
      }
    }
  });

  $("#login-menu-btn").click(function(){
    $(".login-container").removeClass("display-hide");
  });

  $(".login-container").click(function(evt){

     if($(evt.target).closest('#login-form').length)
          return;

      $(".login-container").addClass("display-hide");
  });

  $("#profile-btn").click(function(){
    $(".profile-container").removeClass("display-hide");
    $('body').css('overflow', 'hidden');
  });

  $(".profile-container").click(function(evt){
    $(".profile-container").addClass("display-hide");
    $('body').css('overflow', 'auto');
  });

});