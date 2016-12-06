'use strict'

$(function () {
    function App() {

        this.currentCityOverview = $('#current-city-overview');
        this.currentCityName = $('#current-city-name');
        this.currentLocalTime = $('#current-local-time');
        this.currentPopulation = $('#current-population');
        this.currentWeather = $('#current-weather');
        this.currentCostLiving = $('#current-cost-living');
        this.currentInternet = $('#current-internet');
        this.currentWorkplaces = $('#current-workplaces');
        this.currentSafety = $('#current-safety');
        this.currentLanguages = $('#current-languages');
        this.currentNightlife = $('#current-nightlife');
        this.currentCityMapImage = $('.city-map');
        this.currentCityLogo = $('.round-photo-logo');
        this.noCommentsAlert = $('.no-comments-text');
        this.currentUserBtn = $('#currentUserBtn');


        this.initFirebase();

        this.loadSlider();

        this.getCurrentCityInfo('New-York');

        $('.loginBtn--google').click(function () {
            this.signInGoogle();
            $(".login-container").addClass("display-hide");
        }.bind(this));

        this.showProfileInfo('supermegauser');
        $(".profile-container").removeClass("display-hide");
        $('body').css('overflow', 'hidden');

    }

    App.prototype.loadSlider = function () {
        var ref = this.database.ref('database/cities');

        ref.off();

        var get_info = function (data) {
            var val = data.val();
            displaySlider(val.name, val.shortOverview, val.imageUrl);
        };

        ref.limitToLast(5).on('child_added', get_info);

        var displaySlider = function (name, overview, imageUrl) {
            var node = $($('#slider-item-template').html());
            var list = $($('#slider-list'));

            var obj = this;

            node.find('.slider-city-name').text(name);
            node.find('.hover-city-name').text(name);
            node.find('.hover-city-info').text(overview);

            this.storage.refFromURL(imageUrl).getMetadata().then(function (metadata) {
                var className = name + '_img_background';
                var classElement = node.addClass(className);
                $(classElement).css('background-image', 'url(' + metadata.downloadURLs[0] + ')');
            });

            node.click(function () {
                $('#comment-list').empty();
                obj.noCommentsAlert.show();
                obj.getCurrentCityInfo(name);
            }).bind(this);

            list.append(node);
        }.bind(this)

    };


    App.prototype.getCurrentCityInfo = function (city) {
        var obj = this;
        var cityRef = 'database/cities/' + city;
        var ref = this.database.ref(cityRef);

        var get_data = function (data) {
            var val = data.val();

            obj.displayCurrentInfo(val.name, val.overview,
                val.weather, val.localTime,
                val.population, val.costLiving,
                val.internet, val.workplace,
                val.safety,
                val.languages, val.nightlife,
                val.cityMapImage, val.cityLogo
            );
        };

        ref.on('value', get_data);

        var commentRef = this.database.ref(cityRef + '/comments');

        commentRef.off();

        var get_info = function (data) {
            var val = data.val();
            obj.noCommentsAlert.hide();
            obj.displayComments(val.author, val.text, val.photo,
                val.location, val.time, val.score,
                val.likes);
        }.bind(this);

        commentRef.limitToLast(3).on('child_added', get_info);
    };


    App.prototype.showProfileInfo = function (author) {
        var node = $($('#comment_template').html());
        var list = $($('#profile-comment-list'));

        var name, email, comments, photoUrl;

        var refUser = firebase.database().ref('database/users/' + author);

        refUser.off();

        var get_info = function (data) {
            var val = data.val();
                name = val.name;
                email = val.email;
                comments = val.comments;
                photoUrl = val.photoUrl;
        };

        refUser.on('value', get_info);



        commentRef.off();

        var get_comment_info = function (data) {
            var val = data.val();
            displayProfileComments(val.text, val.photo,
                val.location, val.time, val.score,
                val.likes);
        };

        commentRef.on('value', get_comment_info);

        var displayProfileComments = function (text, photo, location, time, score, likes) {
            node.find('.text').text(text);
            node.find('.comment-time').text(time);

            for (var i = 0; i < 5; i++)
                if (i < score) {
                    node.find('.stars').append('<i class="fa fa-star" aria-hidden="true"></i>');
                } else {
                    node.find('.stars').append('<i class="fa fa-star-o" aria-hidden="true"></i>');
                }

            node.find('.comment-photo').css('background-image', 'url(' + photo + ')');


            node.find('#likes-count').text(likes);
            node.find('#location').text(location);

            node.find('.user-name').text(name);
            var className = photo + '_val.name';
            var classElement = node.find('.user-photo').addClass(className);
            $(classElement).css('background-image', 'url(' + photoUrl + ')');

            $('.profile-picture').css('background-image', 'url(' + photoUrl + ')');

            $('#profile-name').text(name);
            $('#profile-email').text(email);

            list.append(node);

        }
    }.bind(this);

    App.prototype.displayCurrentInfo = function (name, overview, weather,
                                                 localTime, population, costOfLiving,
                                                 internet, workplaces, safety,
                                                 languages, nightlife, cityMapImage,
                                                 cityLogo)
    {
        var obj = this;

        this.storage.refFromURL(cityMapImage).getMetadata().then(function (metadata) {
            obj.currentCityMapImage.css('background', 'url(' + metadata.downloadURLs[0] + ')');
        });

        this.storage.refFromURL(cityLogo).getMetadata().then(function (metadata) {
            obj.currentCityLogo.css('background', 'url(' + metadata.downloadURLs[0] + ')');
        });

        this.currentCityName.text(name);
        this.currentCityOverview.text(overview);
        this.currentWeather.text(weather);
        this.currentLocalTime.text(localTime);
        this.currentPopulation.text(population);
        this.currentCostLiving.text(costOfLiving);
        this.currentInternet.text(internet);
        this.currentWorkplaces.text(workplaces);
        this.currentSafety.text(safety);
        this.currentLanguages.text(languages);
        this.currentNightlife.text(nightlife);

    };


    App.prototype.initFirebase = function () {

        this.auth = firebase.auth();
        this.database = firebase.database();
        this.storage = firebase.storage();

        this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
    };

    App.prototype.signInGoogle = function () {
        var provider = new firebase.auth.GoogleAuthProvider();
        this.auth.signInWithPopup(provider);
    };

    App.prototype.setUserData = function (user) {

        var ref = this.database.ref('database/users/' + user.uid).set({
            name: user.displayName,
            email: user.email,
            photoUrl: user.photoURL || "https://firebasestorage.googleapis.com/v0/b/travel-web-project-b1596.appspot.com/o/person-placeholder.jpg?alt=media&token=68281f5f-4ec0-43de-9fab-c50a1eda171e",
            uid: user.uid
        });

    };


    App.prototype.signOut = function () {
        this.auth.signOut();
    };


    App.prototype.onAuthStateChanged = function (user) {
        if (user) {
            this.setUserData(user);
            $('#login-menu-btn').hide();
            this.currentUserBtn.show();
            $('#current-user').text(user.displayName);
            console.log(user.uid);

            $('#signout-btn').click(function () {
                this.signOut();
            }.bind(this));

            //Add profile action


        } else {
            this.currentUserBtn.hide();
            $('#login-menu-btn').show();
        }

    };

    window.onload = function () {
        window.app = new App();
    };

});