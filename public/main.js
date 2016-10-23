'use strict';

window.app = angular.module('FullstackGeneratedApp', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'uiGmapgoogle-maps']);

app.config(function ($urlRouterProvider, $locationProvider) {
    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/about');
    // Trigger page refresh when accessing an OAuth route
    $urlRouterProvider.when('/auth/:provider', function () {
        window.location.reload();
    });
});

// This app.run is for listening to errors broadcasted by ui-router, usually originating from resolves
app.run(function ($rootScope) {
    $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, thrownError) {
        console.info('The following error was thrown by ui-router while transitioning to state "' + toState.name + '". The origin of this error is probably a resolve function:');
        console.error(thrownError);
    });
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state) {

    // The given state requires an authenticated user.
    var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
        return state.data && state.data.authenticate;
    };

    // $stateChangeStart is an event fired
    // whenever the process of changing a state begins.
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

        if (!destinationStateRequiresAuth(toState)) {
            // The destination state does not require authentication
            // Short circuit with return.
            return;
        }

        if (AuthService.isAuthenticated()) {
            // The user is authenticated.
            // Short circuit with return.
            return;
        }

        // Cancel navigating to new state.
        event.preventDefault();

        AuthService.getLoggedInUser().then(function (user) {
            // If a user is retrieved, then renavigate to the destination
            // (the second time, AuthService.isAuthenticated() will work)
            // otherwise, if no user is logged in, go to "login" state.
            if (user) {
                $state.go(toState.name, toParams);
            } else {
                $state.go('login');
            }
        });
    });
});

app.config(function ($stateProvider) {

    // Register our *about* state.
    $stateProvider.state('about', {
        url: '/about',
        controller: 'AboutController',
        templateUrl: 'js/about/about.html'
    });
});

app.controller('AboutController', function ($scope, Pics) {

    // Images of beautiful Fullstack people.
    $scope.images = _.shuffle(Pics);
});

app.config(function ($stateProvider) {
    $stateProvider.state('docs', {
        url: '/governmentforms',
        templateUrl: 'js/docs/docs.html',
        controller: 'FormController'
    });
});

app.controller('FormController', function ($scope, $http) {
    $scope.getCert = function () {
        $http.get('/api/forms/birth-certificate', { responseType: 'arraybuffer' }).success(function (data) {
            var file = new Blob([data], { type: 'application/pdf' });
            var fileURL = URL.createObjectURL(file);
            window.open(fileURL);
        }).catch(function (error) {
            console.error(error);
        });
    };

    $scope.getSocialCert = function () {
        $http.get('/api/forms/social-security', { responseType: 'arraybuffer' }).success(function (data) {
            var file = new Blob([data], { type: 'application/pdf' });
            var fileURL = URL.createObjectURL(file);
            window.open(fileURL);
        }).catch(function (error) {
            console.error(error);
        });
    };
});

app.config(function ($stateProvider) {
    $stateProvider.state('formlist', {
        url: '/govforms',
        templateUrl: 'js/formlist/formlist.html',
        controller: 'FormCtrl'
    });
});

app.controller('FormCtrl', function ($scope, $http) {
    $scope.getCert = function () {
        $http.get('/api/forms/birth-certificate', { responseType: 'arraybuffer' }).success(function (data) {
            var file = new Blob([data], { type: 'application/pdf' });
            var fileURL = URL.createObjectURL(file);
            window.open(fileURL);
        }).catch(function (error) {
            console.error(error);
        });
    };

    $scope.getSocialCert = function () {
        $http.get('/api/forms/social-security', { responseType: 'arraybuffer' }).success(function (data) {
            var file = new Blob([data], { type: 'application/pdf' });
            var fileURL = URL.createObjectURL(file);
            window.open(fileURL);
        }).catch(function (error) {
            console.error(error);
        });
    };
});

app.config(function ($stateProvider) {

    $stateProvider.state('forms', {
        url: '/forms',
        templateUrl: 'js/forms/forms.html'
    }).state('forms.lookup', {
        url: '/lookup',
        templateUrl: '/js/forms/templates/lookup.html',
        controller: 'LookupCtl'
    });
});
(function () {

    'use strict';

    // Hope you didn't forget Angular! Duh-doy.

    if (!window.angular) throw new Error('I can\'t find Angular!');

    var app = angular.module('fsaPreBuilt', []);

    app.factory('Socket', function () {
        if (!window.io) throw new Error('socket.io not found!');
        return window.io(window.location.origin);
    });

    // AUTH_EVENTS is used throughout our app to
    // broadcast and listen from and to the $rootScope
    // for important events about authentication flow.
    app.constant('AUTH_EVENTS', {
        loginSuccess: 'auth-login-success',
        loginFailed: 'auth-login-failed',
        logoutSuccess: 'auth-logout-success',
        sessionTimeout: 'auth-session-timeout',
        notAuthenticated: 'auth-not-authenticated',
        notAuthorized: 'auth-not-authorized'
    });

    app.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
        var statusDict = {
            401: AUTH_EVENTS.notAuthenticated,
            403: AUTH_EVENTS.notAuthorized,
            419: AUTH_EVENTS.sessionTimeout,
            440: AUTH_EVENTS.sessionTimeout
        };
        return {
            responseError: function responseError(response) {
                $rootScope.$broadcast(statusDict[response.status], response);
                return $q.reject(response);
            }
        };
    });

    app.config(function ($httpProvider) {
        $httpProvider.interceptors.push(['$injector', function ($injector) {
            return $injector.get('AuthInterceptor');
        }]);
    });

    app.service('AuthService', function ($http, Session, $rootScope, AUTH_EVENTS, $q) {

        function onSuccessfulLogin(response) {
            var user = response.data.user;
            Session.create(user);
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            return user;
        }

        // Uses the session factory to see if an
        // authenticated user is currently registered.
        this.isAuthenticated = function () {
            return !!Session.user;
        };

        this.getLoggedInUser = function (fromServer) {

            // If an authenticated session exists, we
            // return the user attached to that session
            // with a promise. This ensures that we can
            // always interface with this method asynchronously.

            // Optionally, if true is given as the fromServer parameter,
            // then this cached value will not be used.

            if (this.isAuthenticated() && fromServer !== true) {
                return $q.when(Session.user);
            }

            // Make request GET /session.
            // If it returns a user, call onSuccessfulLogin with the response.
            // If it returns a 401 response, we catch it and instead resolve to null.
            return $http.get('/session').then(onSuccessfulLogin).catch(function () {
                return null;
            });
        };

        this.login = function (credentials) {
            return $http.post('/login', credentials).then(onSuccessfulLogin).catch(function () {
                return $q.reject({ message: 'Invalid login credentials.' });
            });
        };

        this.logout = function () {
            return $http.get('/logout').then(function () {
                Session.destroy();
                $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
            });
        };
    });

    app.service('Session', function ($rootScope, AUTH_EVENTS) {

        var self = this;

        $rootScope.$on(AUTH_EVENTS.notAuthenticated, function () {
            self.destroy();
        });

        $rootScope.$on(AUTH_EVENTS.sessionTimeout, function () {
            self.destroy();
        });

        this.user = null;

        this.create = function (user) {
            this.user = user;
        };

        this.destroy = function () {
            this.user = null;
        };
    });
})();

app.config(function ($stateProvider) {
    $stateProvider.state('start', {
        url: '/start',
        templateUrl: 'js/getStarted/start.html',
        controller: 'StartCtrl'
    });
});

app.controller('StartCtrl', function ($scope, $http) {
    $scope.showForms = false;

    $scope.options = [{ value: '', label: 'choose one' }, { value: true, label: 'true' }, { value: false, label: 'false' }];

    $scope.updatingInfo = function () {

        var information = {
            firstName: $scope.currentPerson.firstName,
            lastName: $scope.currentPerson.lastName,
            SSN: $scope.currentPerson.SSN,
            DOB: $scope.currentPerson.DOB,
            gender: $scope.currentPerson.gender,
            race: $scope.currentPerson.race,
            veteranStatus: $scope.currentPerson.veteranStatus,
            phone: $scope.currentPerson.phone
        };
        if ($scope.needsPost) {
            $http.post('api/clients', information).then(function (person) {
                $scope.updatedPerson = person.data;
            });
        } else {
            $http.put('api/clients', information).then(function (person) {
                $scope.updatedPerson = person.data;
            });
        }

        $('html,body').animate({ scrollTop: $(document).height() }, 1000);
    };

    $scope.checkDB = function (person) {
        $http.get('/api/clients', {
            params: {
                firstName: person.firstName,
                lastName: person.lastName,
                DOB: person.DOB
            }
        }).then(function (person) {
            if (person.data.id) {
                $scope.currentPerson = person.data;
                $scope.needsPut = true;
            } else {
                $scope.needsPost = true;
            }
            $scope.isCurrentPerson = true;
            $scope.showForms = true;
        }).then(function () {
            $('html,body').animate({ scrollTop: $(document).height() }, 1000);
        }).catch(function (error) {
            console.error("ERR", error);
        });
    };
});

app.config(function ($stateProvider) {

    $stateProvider.state('jobsMap', {
        url: '/jobs-map',
        templateUrl: './js/googleMaps/googleMaps.html',
        controller: 'jobsMapCtrl',
        resolve: {
            jobs: function jobs(jobLocsFactory) {
                return jobLocsFactory.getJobs();
            }
        }
    });
});

app.controller('jobsMapCtrl', function ($scope, jobLocsFactory, jobs, uiGmapGoogleMapApi, $http) {
    $scope.jobs = jobs;
    var idCounter = 0;
    $scope.infoWindowArrays = [];

    $scope.addNewJob = function () {
        var infoWindowsArrays = $scope.infoWindowArrays;

        return $http.post('/api/jobLocs', $scope.job).then(function (job) {
            console.log('here is new job', job);
            $scope.jobs.push(job.data);
            var newInfoWindow = new google.maps.InfoWindow({
                content: '<div id="content"> <b>' + 'Name of Employer: </b>' + job.data.employer + '</div>' + '<div ><b>' + 'Description: </b>' + job.data.description + '</div>' + '<div > <b>' + 'Industry: </b>' + job.data.industry + '</div>',

                maxWidth: 200
            });
            infoWindowsArrays.push(newInfoWindow);
            var marker = {
                id: idCounter,
                coords: {
                    latitude: job.data.latitude,
                    longitude: job.data.longitude
                },
                markerEvents: {
                    click: function click(marker, eventName, model, originalEventArgs) {
                        infoWindowsArrays[model.idKey].open(model.map, marker);
                    }
                }
            };
            $scope.map.markers.push(marker);
            idCounter++;
            return marker;
        }).then(function (marker) {
            console.log('NEW MARKER', marker);
            console.log('jobs', $scope.jobs);
            markerInit($scope.jobs, idCounter, $scope);
        });
    };

    // var events = {
    //     places_changed: function (searchBox) {
    //         console.log('is this undefined', searchBox)
    //         var place = searchBox.getPlaces();
    //         if (!place || place == 'undefined' || place.length == 0) {
    //             console.log('no place data :(');
    //             return;
    //         }

    //         $scope.map = {
    //             "center": {
    //                 "latitude": place[0].geometry.location.lat(),
    //                 "longitude": place[0].geometry.location.lng()
    //             },
    //             "zoom": 18
    //         };

    //         $scope.marker = {
    //             id: 0,
    //             coords: {
    //                 latitude: place[0].geometry.location.lat(),
    //                 longitude: place[0].geometry.location.lng()
    //             }
    //         };
    //     }
    // };
    // $scope.searchbox = { template: 'searchbox.tpl.html', events: events };

    // console.log('EVENTS?', $scope.searchbox)

    angular.extend($scope, {
        map: {
            center: {
                latitude: 38.627,
                longitude: -90.197
            },
            zoom: 12,
            markers: [],
            events: {
                click: function click(map, eventName, model, originalEventArgs, $scope) {
                    // console.log('hey there');
                    // console.log('Marker was clicked' + map)
                    //                     console.log('eventName' + eventName)
                    //                     console.log('model' + model)
                    //                     console.log('originalEventArgs' + originalEventArgs)

                    // var e = originalEventArgs[0];
                    // var lat = e.latLng.lat(),lon = e.latLng.lng();
                    // var marker = {
                    //     id: Date.now(),
                    //     coords: {
                    //         latitude: lat,
                    //         longitude: lon
                    //     },
                    // };
                    // $scope.map.markers.push(marker);
                }
            }
        }
    });

    markerInit($scope.jobs, idCounter, $scope);

    function markerInit(jobs, idCounter, $scope) {
        var infoWindowsArrays = $scope.infoWindowArrays;

        jobs.forEach(function (job) {
            var newInfoWindow = new google.maps.InfoWindow({
                content: '<div id="content"> <b>' + 'Name of Employer: </b>' + job.employer + '</div>' + '<div ><b>' + 'Description: </b>' + job.description + '</div>' + '<div > <b>' + 'Industry: </b>' + job.industry + '</div>',

                maxWidth: 200
            });
            infoWindowsArrays.push(newInfoWindow);

            var marker = {
                id: idCounter,
                coords: {
                    latitude: job.latitude,
                    longitude: job.longitude
                },
                markerEvents: {
                    click: function click(marker, eventName, model, originalEventArgs) {
                        // console.log('heres infoWindowArrays ,', infoWindowsArrays[model.idKey])
                        infoWindowsArrays[model.idKey].open(model.map, marker);
                        // console.log('Marker was clicked', marker)
                        // console.log('heres this ', this)
                        // console.log('eventName', eventName)
                        // console.log('model', model)
                        // console.log('originalEventArgs', originalEventArgs)
                        // console.log('heres the var infoWindowsArrays click event in marker', infoWindowsArrays)
                    }
                }
            };
            $scope.map.markers.push(marker);
            idCounter++;
        });
    }
});

app.factory('jobLocsFactory', function ($http) {
    var jobLocsFactory = {};

    jobLocsFactory.getJobs = function () {
        return $http.get('/api/jobLocs').then(function (res) {
            return res.data;
        });
    };

    jobLocsFactory.postNewJob = function () {
        return $http.post('/api/jobLocs');
    };
    return jobLocsFactory;
});

app.config(function (uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyAdN3TfE13kxOFBRcgOQiRSsSs1_TFly8s',
        v: '3.20', //defaults to latest 3.X anyhow
        libraries: 'weather,geometry,visualization'
    });
});

// app.config(function ($stateProvider) {
//     $stateProvider.state('home', {
//         url: '/',
//         templateUrl: 'js/home/home.html'
//     });
// });

app.config(function ($stateProvider) {

    $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'js/login/login.html',
        controller: 'LoginCtrl'
    });
});

app.controller('LoginCtrl', function ($scope, AuthService, $state) {

    $scope.login = {};
    $scope.error = null;

    $scope.sendLogin = function (loginInfo) {

        $scope.error = null;

        AuthService.login(loginInfo).then(function () {
            $state.go('home');
        }).catch(function () {
            $scope.error = 'Invalid login credentials.';
        });
    };
});

app.config(function ($stateProvider) {

    $stateProvider.state('membersOnly', {
        url: '/members-area',
        template: '<img ng-repeat="item in stash" width="300" ng-src="{{ item }}" />',
        controller: function controller($scope, SecretStash) {
            SecretStash.getStash().then(function (stash) {
                $scope.stash = stash;
            });
        },
        // The following data.authenticate is read by an event listener
        // that controls access to this state. Refer to app.js.
        data: {
            authenticate: true
        }
    });
});

app.factory('SecretStash', function ($http) {

    var getStash = function getStash() {
        return $http.get('/api/members/secret-stash').then(function (response) {
            return response.data;
        });
    };

    return {
        getStash: getStash
    };
});

app.factory('Pics', function () {
    return ['https://fabiandembski.files.wordpress.com/2015/03/users-fabianp-documents-jobs-arch-shih-neuer-ordner-installation6.jpg?w=640&h=392&crop=1', 'http://beatthe9to5.com/wp-content/uploads/2012/08/job-Search-1.jpg', 'http://hpcvt.org/wp-content/uploads/2014/02/hands-holding-house-image.jpg'];
});

app.controller('LookupCtl', function ($scope) {
    $scope.getClientInfo = function () {};
});
app.directive('basicinfo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/basicInfo/basicinfo.html'
    };
});

app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
    };
});

app.directive('missingforms', function ($http) {
    return {
        restrict: 'E',
        scope: false,
        templateUrl: 'js/common/directives/missingforms/missingforms.html',
        link: function link(scope) {
            console.log(scope);
            scope.getBC = function () {
                console.log('hello');
                window.open('/api/forms/birth-certificate/complete?firstname=' + scope.currentPerson.First_Name + '&lastname=' + scope.currentPerson.Last_Name + '&DOB=' + scope.currentPerson.DOB);
            };
            scope.getSSC = function () {
                console.log('hello');
                window.open('/api/forms/birth-certificate/complete?firstname=' + scope.currentPerson.First_Name + '&lastname=' + scope.currentPerson.Last_Name + '&DOB=' + scope.currentPerson.DOB);
            };
            scope.getFS = function () {
                window.open('/api/forms/food-stamps/complete?firstname=' + scope.currentPerson.First_Name + '&lastname=' + scope.currentPerson.Last_Name + '&DOB=' + scope.currentPerson.DOB);
            };
        }

    };
});

app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function link(scope) {

            scope.items = [{ label: 'About', state: 'about' }, { label: 'Form List', state: 'formlist' }, { label: 'Get Started', state: 'start' }, { label: 'Jobs Map', state: 'jobsMap' }];

            scope.user = null;

            scope.isLoggedIn = function () {
                return AuthService.isAuthenticated();
            };

            scope.logout = function () {
                AuthService.logout().then(function () {
                    $state.go('home');
                });
            };

            var setUser = function setUser() {
                AuthService.getLoggedInUser().then(function (user) {
                    scope.user = user;
                });
            };

            var removeUser = function removeUser() {
                scope.user = null;
            };

            setUser();

            $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
            $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
            $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);
        }

    };
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZm9ybWxpc3QvZm9ybWxpc3QuanMiLCJmb3Jtcy9mb3Jtcy5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2V0U3RhcnRlZC9nZXRTdGFydGVkLmpzIiwiZ29vZ2xlTWFwcy9nb29nbGVNYXBzLmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9QaWNzLmpzIiwiZm9ybXMvY29udHJvbGxlci9Mb29rdXBDdGwuanMiLCJjb21tb24vZGlyZWN0aXZlcy9iYXNpY0luZm8vYmFzaWNpbmZvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9taXNzaW5nZm9ybXMvbWlzc2luZ2Zvcm1zLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyJdLCJuYW1lcyI6WyJ3aW5kb3ciLCJhcHAiLCJhbmd1bGFyIiwibW9kdWxlIiwiY29uZmlnIiwiJHVybFJvdXRlclByb3ZpZGVyIiwiJGxvY2F0aW9uUHJvdmlkZXIiLCJodG1sNU1vZGUiLCJvdGhlcndpc2UiLCJ3aGVuIiwibG9jYXRpb24iLCJyZWxvYWQiLCJydW4iLCIkcm9vdFNjb3BlIiwiJG9uIiwiZXZlbnQiLCJ0b1N0YXRlIiwidG9QYXJhbXMiLCJmcm9tU3RhdGUiLCJmcm9tUGFyYW1zIiwidGhyb3duRXJyb3IiLCJjb25zb2xlIiwiaW5mbyIsIm5hbWUiLCJlcnJvciIsIkF1dGhTZXJ2aWNlIiwiJHN0YXRlIiwiZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCIsInN0YXRlIiwiZGF0YSIsImF1dGhlbnRpY2F0ZSIsImlzQXV0aGVudGljYXRlZCIsInByZXZlbnREZWZhdWx0IiwiZ2V0TG9nZ2VkSW5Vc2VyIiwidGhlbiIsInVzZXIiLCJnbyIsIiRzdGF0ZVByb3ZpZGVyIiwidXJsIiwiY29udHJvbGxlciIsInRlbXBsYXRlVXJsIiwiJHNjb3BlIiwiUGljcyIsImltYWdlcyIsIl8iLCJzaHVmZmxlIiwiJGh0dHAiLCJnZXRDZXJ0IiwiZ2V0IiwicmVzcG9uc2VUeXBlIiwic3VjY2VzcyIsImZpbGUiLCJCbG9iIiwidHlwZSIsImZpbGVVUkwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJvcGVuIiwiY2F0Y2giLCJnZXRTb2NpYWxDZXJ0IiwiRXJyb3IiLCJmYWN0b3J5IiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsInNlcnZpY2UiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwibG9naW4iLCJjcmVkZW50aWFscyIsInBvc3QiLCJtZXNzYWdlIiwibG9nb3V0IiwiZGVzdHJveSIsInNlbGYiLCJzaG93Rm9ybXMiLCJvcHRpb25zIiwidmFsdWUiLCJsYWJlbCIsInVwZGF0aW5nSW5mbyIsImluZm9ybWF0aW9uIiwiZmlyc3ROYW1lIiwiY3VycmVudFBlcnNvbiIsImxhc3ROYW1lIiwiU1NOIiwiRE9CIiwiZ2VuZGVyIiwicmFjZSIsInZldGVyYW5TdGF0dXMiLCJwaG9uZSIsIm5lZWRzUG9zdCIsInBlcnNvbiIsInVwZGF0ZWRQZXJzb24iLCJwdXQiLCIkIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsImRvY3VtZW50IiwiaGVpZ2h0IiwiY2hlY2tEQiIsInBhcmFtcyIsImlkIiwibmVlZHNQdXQiLCJpc0N1cnJlbnRQZXJzb24iLCJyZXNvbHZlIiwiam9icyIsImpvYkxvY3NGYWN0b3J5IiwiZ2V0Sm9icyIsInVpR21hcEdvb2dsZU1hcEFwaSIsImlkQ291bnRlciIsImluZm9XaW5kb3dBcnJheXMiLCJhZGROZXdKb2IiLCJpbmZvV2luZG93c0FycmF5cyIsImpvYiIsImxvZyIsIm5ld0luZm9XaW5kb3ciLCJnb29nbGUiLCJtYXBzIiwiSW5mb1dpbmRvdyIsImNvbnRlbnQiLCJlbXBsb3llciIsImRlc2NyaXB0aW9uIiwiaW5kdXN0cnkiLCJtYXhXaWR0aCIsIm1hcmtlciIsImNvb3JkcyIsImxhdGl0dWRlIiwibG9uZ2l0dWRlIiwibWFya2VyRXZlbnRzIiwiY2xpY2siLCJldmVudE5hbWUiLCJtb2RlbCIsIm9yaWdpbmFsRXZlbnRBcmdzIiwiaWRLZXkiLCJtYXAiLCJtYXJrZXJzIiwibWFya2VySW5pdCIsImV4dGVuZCIsImNlbnRlciIsInpvb20iLCJldmVudHMiLCJmb3JFYWNoIiwicmVzIiwicG9zdE5ld0pvYiIsInVpR21hcEdvb2dsZU1hcEFwaVByb3ZpZGVyIiwiY29uZmlndXJlIiwia2V5IiwidiIsImxpYnJhcmllcyIsInNlbmRMb2dpbiIsImxvZ2luSW5mbyIsInRlbXBsYXRlIiwiU2VjcmV0U3Rhc2giLCJnZXRTdGFzaCIsInN0YXNoIiwiZ2V0Q2xpZW50SW5mbyIsImRpcmVjdGl2ZSIsInJlc3RyaWN0Iiwic2NvcGUiLCJsaW5rIiwiZ2V0QkMiLCJGaXJzdF9OYW1lIiwiTGFzdF9OYW1lIiwiZ2V0U1NDIiwiZ2V0RlMiLCJpdGVtcyIsImlzTG9nZ2VkSW4iLCJzZXRVc2VyIiwicmVtb3ZlVXNlciJdLCJtYXBwaW5ncyI6IkFBQUE7O0FBQ0FBLE9BQUFDLEdBQUEsR0FBQUMsUUFBQUMsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLEVBQUEsbUJBQUEsQ0FBQSxDQUFBOztB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QUFBc0UsT0FBQSxhQUFBLEVBQUF0RSxPQUFBLE9BQUEsRUFIQSxFQUlBLEVBQUFzRSxPQUFBLFVBQUEsRUFBQXRFLE9BQUEsU0FBQSxFQUpBLENBQUE7O0FBT0FzSixrQkFBQS9JLElBQUEsR0FBQSxJQUFBOztBQUVBK0ksa0JBQUFRLFVBQUEsR0FBQSxZQUFBO0FBQ0EsdUJBQUFqSyxZQUFBTSxlQUFBLEVBQUE7QUFDQSxhQUZBOztBQUlBbUosa0JBQUF0RixNQUFBLEdBQUEsWUFBQTtBQUNBbkUsNEJBQUFtRSxNQUFBLEdBQUExRCxJQUFBLENBQUEsWUFBQTtBQUNBUiwyQkFBQVUsRUFBQSxDQUFBLE1BQUE7QUFDQSxpQkFGQTtBQUdBLGFBSkE7O0FBTUEsZ0JBQUF1SixVQUFBLFNBQUFBLE9BQUEsR0FBQTtBQUNBbEssNEJBQUFRLGVBQUEsR0FBQUMsSUFBQSxDQUFBLFVBQUFDLElBQUEsRUFBQTtBQUNBK0ksMEJBQUEvSSxJQUFBLEdBQUFBLElBQUE7QUFDQSxpQkFGQTtBQUdBLGFBSkE7O0FBTUEsZ0JBQUF5SixhQUFBLFNBQUFBLFVBQUEsR0FBQTtBQUNBVixzQkFBQS9JLElBQUEsR0FBQSxJQUFBO0FBQ0EsYUFGQTs7QUFJQXdKOztBQUVBOUssdUJBQUFDLEdBQUEsQ0FBQTBELFlBQUFQLFlBQUEsRUFBQTBILE9BQUE7QUFDQTlLLHVCQUFBQyxHQUFBLENBQUEwRCxZQUFBTCxhQUFBLEVBQUF5SCxVQUFBO0FBQ0EvSyx1QkFBQUMsR0FBQSxDQUFBMEQsWUFBQUosY0FBQSxFQUFBd0gsVUFBQTtBQUVBOztBQXpDQSxLQUFBO0FBNkNBLENBL0NBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnLCd1aUdtYXBnb29nbGUtbWFwcyddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnL2Fib3V0Jyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBsaXN0ZW5pbmcgdG8gZXJyb3JzIGJyb2FkY2FzdGVkIGJ5IHVpLXJvdXRlciwgdXN1YWxseSBvcmlnaW5hdGluZyBmcm9tIHJlc29sdmVzXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZUVycm9yJywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zLCB0aHJvd25FcnJvcikge1xuICAgICAgICBjb25zb2xlLmluZm8oYFRoZSBmb2xsb3dpbmcgZXJyb3Igd2FzIHRocm93biBieSB1aS1yb3V0ZXIgd2hpbGUgdHJhbnNpdGlvbmluZyB0byBzdGF0ZSBcIiR7dG9TdGF0ZS5uYW1lfVwiLiBUaGUgb3JpZ2luIG9mIHRoaXMgZXJyb3IgaXMgcHJvYmFibHkgYSByZXNvbHZlIGZ1bmN0aW9uOmApO1xuICAgICAgICBjb25zb2xlLmVycm9yKHRocm93bkVycm9yKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoUGljcyk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZG9jcycsIHtcbiAgICAgICAgdXJsOiAnL2dvdmVybm1lbnRmb3JtcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZG9jcy9kb2NzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnRm9ybUNvbnRyb2xsZXInXG4gICAgfSk7XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Zvcm1Db250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkaHR0cCl7XG4gICAgJHNjb3BlLmdldENlcnQgPSBmdW5jdGlvbigpe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvZm9ybXMvYmlydGgtY2VydGlmaWNhdGUnLCB7cmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInfSlcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9wZGYnfSlcbiAgICAgICAgICAgIHZhciBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGZpbGVVUkwpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAgICAgJHNjb3BlLmdldFNvY2lhbENlcnQgPSBmdW5jdGlvbigpe1xuICAgICAgICAkaHR0cC5nZXQoJy9hcGkvZm9ybXMvc29jaWFsLXNlY3VyaXR5Jywge3Jlc3BvbnNlVHlwZTogJ2FycmF5YnVmZmVyJ30pXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgdmFyIGZpbGUgPSBuZXcgQmxvYihbZGF0YV0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pXG4gICAgICAgICAgICB2YXIgZmlsZVVSTCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gICAgICAgICAgICB3aW5kb3cub3BlbihmaWxlVVJMKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxuXG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZm9ybWxpc3QnLCB7XG4gICAgICAgIHVybDogJy9nb3Zmb3JtcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZm9ybWxpc3QvZm9ybWxpc3QuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdGb3JtQ3RybCdcbiAgICB9KTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignRm9ybUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRodHRwKXtcbiAgICAkc2NvcGUuZ2V0Q2VydCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9mb3Jtcy9iaXJ0aC1jZXJ0aWZpY2F0ZScsIHtyZXNwb25zZVR5cGU6ICdhcnJheWJ1ZmZlcid9KVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIHZhciBmaWxlID0gbmV3IEJsb2IoW2RhdGFdLCB7dHlwZTogJ2FwcGxpY2F0aW9uL3BkZid9KVxuICAgICAgICAgICAgdmFyIGZpbGVVUkwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgICAgICAgICAgd2luZG93Lm9wZW4oZmlsZVVSTCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgICAgICAkc2NvcGUuZ2V0U29jaWFsQ2VydCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9mb3Jtcy9zb2NpYWwtc2VjdXJpdHknLCB7cmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInfSlcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9wZGYnfSlcbiAgICAgICAgICAgIHZhciBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGZpbGVVUkwpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICAgICAgfSlcbiAgICB9XG5cbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Zvcm1zJywge1xuICAgICAgICB1cmw6ICcvZm9ybXMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Zvcm1zL2Zvcm1zLmh0bWwnLFxuICAgIH0pICAgIFxuICAgIC5zdGF0ZSgnZm9ybXMubG9va3VwJywge1xuICAgICAgICB1cmw6ICcvbG9va3VwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvanMvZm9ybXMvdGVtcGxhdGVzL2xvb2t1cC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvb2t1cEN0bCdcbiAgICB9KVxufSk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciB1c2VyID0gcmVzcG9uc2UuZGF0YS51c2VyO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUodXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KCkpO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc3RhcnQnLCB7XG4gICAgICAgIHVybDogJy9zdGFydCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZ2V0U3RhcnRlZC9zdGFydC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1N0YXJ0Q3RybCdcbiAgICB9KTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignU3RhcnRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkaHR0cCl7XG4gICAgJHNjb3BlLnNob3dGb3JtcyA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLm9wdGlvbnMgPSBbXG4gICAgICAgIHt2YWx1ZTogJycsIGxhYmVsOiAnY2hvb3NlIG9uZSd9LFxuICAgICAgICB7dmFsdWU6IHRydWUsIGxhYmVsOiAndHJ1ZSd9LFxuICAgICAgICB7dmFsdWU6IGZhbHNlLCBsYWJlbDogJ2ZhbHNlJ31cbiAgICBdO1xuXG4gICAgJHNjb3BlLnVwZGF0aW5nSW5mbyA9IGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgdmFyIGluZm9ybWF0aW9uID0ge1xuICAgICAgICAgICAgZmlyc3ROYW1lOiAkc2NvcGUuY3VycmVudFBlcnNvbi5maXJzdE5hbWUsXG4gICAgICAgICAgICBsYXN0TmFtZTogJHNjb3BlLmN1cnJlbnRQZXJzb24ubGFzdE5hbWUsXG4gICAgICAgICAgICBTU046ICRzY29wZS5jdXJyZW50UGVyc29uLlNTTixcbiAgICAgICAgICAgIERPQjogJHNjb3BlLmN1cnJlbnRQZXJzb24uRE9CLFxuICAgICAgICAgICAgZ2VuZGVyOiAkc2NvcGUuY3VycmVudFBlcnNvbi5nZW5kZXIsXG4gICAgICAgICAgICByYWNlOiAkc2NvcGUuY3VycmVudFBlcnNvbi5yYWNlLFxuICAgICAgICAgICAgdmV0ZXJhblN0YXR1czogJHNjb3BlLmN1cnJlbnRQZXJzb24udmV0ZXJhblN0YXR1cyxcbiAgICAgICAgICAgIHBob25lOiAkc2NvcGUuY3VycmVudFBlcnNvbi5waG9uZVxuICAgICAgICB9XG4gICAgICAgIGlmICgkc2NvcGUubmVlZHNQb3N0KSB7XG4gICAgICAgICAgICAkaHR0cC5wb3N0KCdhcGkvY2xpZW50cycsIGluZm9ybWF0aW9uKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocGVyc29uKXtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlZFBlcnNvbiA9IHBlcnNvbi5kYXRhO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRodHRwLnB1dCgnYXBpL2NsaWVudHMnLCBpbmZvcm1hdGlvbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHBlcnNvbil7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZWRQZXJzb24gPSBwZXJzb24uZGF0YTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICAkKCdodG1sLGJvZHknKS5hbmltYXRlKHtzY3JvbGxUb3A6ICQoZG9jdW1lbnQpLmhlaWdodCgpIH0sIDEwMDApO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2hlY2tEQiA9IGZ1bmN0aW9uKHBlcnNvbil7XG4gICAgICAgICRodHRwLmdldCgnL2FwaS9jbGllbnRzJywge1xuICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgZmlyc3ROYW1lOiBwZXJzb24uZmlyc3ROYW1lLFxuICAgICAgICAgICAgICAgIGxhc3ROYW1lOiBwZXJzb24ubGFzdE5hbWUsXG4gICAgICAgICAgICAgICAgRE9COiBwZXJzb24uRE9CXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHBlcnNvbil7XG4gICAgICAgICAgICBpZiAocGVyc29uLmRhdGEuaWQpe1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UGVyc29uID0gcGVyc29uLmRhdGE7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5lZWRzUHV0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5lZWRzUG9zdCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuaXNDdXJyZW50UGVyc29uID0gdHJ1ZTtcbiAgICAgICAgICAgICRzY29wZS5zaG93Rm9ybXMgPSB0cnVlO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKGRvY3VtZW50KS5oZWlnaHQoKSB9LCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFUlJcIiwgZXJyb3IpXG4gICAgICAgIH0pXG4gICAgfVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnam9ic01hcCcsIHtcbiAgICAgICAgdXJsOiAnL2pvYnMtbWFwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcuL2pzL2dvb2dsZU1hcHMvZ29vZ2xlTWFwcy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ2pvYnNNYXBDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgam9iczogZnVuY3Rpb24oam9iTG9jc0ZhY3Rvcnkpe1xuICAgICAgICAgICAgICAgIHJldHVybiBqb2JMb2NzRmFjdG9yeS5nZXRKb2JzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdqb2JzTWFwQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgam9iTG9jc0ZhY3RvcnksIGpvYnMsIHVpR21hcEdvb2dsZU1hcEFwaSwgJGh0dHApe1xuICAgICRzY29wZS5qb2JzID0gam9iczsgXG4gICAgdmFyIGlkQ291bnRlciA9IDA7XG4gICAgJHNjb3BlLmluZm9XaW5kb3dBcnJheXMgPSBbXTtcblxuICAgICRzY29wZS5hZGROZXdKb2IgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgaW5mb1dpbmRvd3NBcnJheXMgPSAkc2NvcGUuaW5mb1dpbmRvd0FycmF5cztcblxuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9qb2JMb2NzJywgJHNjb3BlLmpvYilcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oam9iKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdoZXJlIGlzIG5ldyBqb2InLCBqb2IpXG4gICAgICAgICAgICAkc2NvcGUuam9icy5wdXNoKGpvYi5kYXRhKVxuICAgICAgICAgICAgdmFyIG5ld0luZm9XaW5kb3cgPSBuZXcgZ29vZ2xlLm1hcHMuSW5mb1dpbmRvdyh7XG4gICAgICAgICAgICAgICAgY29udGVudDogJzxkaXYgaWQ9XCJjb250ZW50XCI+IDxiPicrXG4gICAgICAgICAgICAgICAgJ05hbWUgb2YgRW1wbG95ZXI6IDwvYj4nICsgam9iLmRhdGEuZW1wbG95ZXIgK1xuICAgICAgICAgICAgJzwvZGl2PicrJzxkaXYgPjxiPicrXG4gICAgICAgICAgICAgICAgJ0Rlc2NyaXB0aW9uOiA8L2I+JyArIGpvYi5kYXRhLmRlc2NyaXB0aW9uICtcbiAgICAgICAgICAgICc8L2Rpdj4nKyc8ZGl2ID4gPGI+JytcbiAgICAgICAgICAgICAgICAnSW5kdXN0cnk6IDwvYj4nICsgam9iLmRhdGEuaW5kdXN0cnkgK1xuICAgICAgICAgICAgJzwvZGl2PidcbiAgICAgICAgICAgICxcbiAgICAgICAgICAgICAgICBtYXhXaWR0aDogMjAwXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgaW5mb1dpbmRvd3NBcnJheXMucHVzaChuZXdJbmZvV2luZG93KVxuICAgICAgICAgICAgdmFyIG1hcmtlciA9IHtcbiAgICAgICAgICAgICAgICBpZDogaWRDb3VudGVyLFxuICAgICAgICAgICAgICAgIGNvb3Jkczoge1xuICAgICAgICAgICAgICAgICAgICBsYXRpdHVkZTogam9iLmRhdGEubGF0aXR1ZGUsXG4gICAgICAgICAgICAgICAgICAgIGxvbmdpdHVkZTogam9iLmRhdGEubG9uZ2l0dWRlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtYXJrZXJFdmVudHM6IHtcbiAgICAgICAgICAgICAgICAgICAgY2xpY2s6IGZ1bmN0aW9uIChtYXJrZXIsIGV2ZW50TmFtZSwgbW9kZWwsIG9yaWdpbmFsRXZlbnRBcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmZvV2luZG93c0FycmF5c1ttb2RlbC5pZEtleV0ub3Blbihtb2RlbC5tYXAsbWFya2VyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgJHNjb3BlLm1hcC5tYXJrZXJzLnB1c2gobWFya2VyKTtcbiAgICAgICAgICAgIGlkQ291bnRlcisrO1xuICAgICAgICAgICAgcmV0dXJuIG1hcmtlcjtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24obWFya2VyKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdORVcgTUFSS0VSJywgbWFya2VyKVxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2pvYnMnLCAkc2NvcGUuam9icylcbiAgICAgICAgICAgIG1hcmtlckluaXQoJHNjb3BlLmpvYnMsIGlkQ291bnRlciwgJHNjb3BlKTtcbiAgICAgICAgfSlcblxuICAgIH1cblxuICAgIC8vIHZhciBldmVudHMgPSB7XG4gICAgLy8gICAgIHBsYWNlc19jaGFuZ2VkOiBmdW5jdGlvbiAoc2VhcmNoQm94KSB7XG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnaXMgdGhpcyB1bmRlZmluZWQnLCBzZWFyY2hCb3gpXG4gICAgLy8gICAgICAgICB2YXIgcGxhY2UgPSBzZWFyY2hCb3guZ2V0UGxhY2VzKCk7XG4gICAgLy8gICAgICAgICBpZiAoIXBsYWNlIHx8IHBsYWNlID09ICd1bmRlZmluZWQnIHx8IHBsYWNlLmxlbmd0aCA9PSAwKSB7XG4gICAgLy8gICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIHBsYWNlIGRhdGEgOignKTtcbiAgICAvLyAgICAgICAgICAgICByZXR1cm47XG4gICAgLy8gICAgICAgICB9XG5cbiAgICAvLyAgICAgICAgICRzY29wZS5tYXAgPSB7XG4gICAgLy8gICAgICAgICAgICAgXCJjZW50ZXJcIjoge1xuICAgIC8vICAgICAgICAgICAgICAgICBcImxhdGl0dWRlXCI6IHBsYWNlWzBdLmdlb21ldHJ5LmxvY2F0aW9uLmxhdCgpLFxuICAgIC8vICAgICAgICAgICAgICAgICBcImxvbmdpdHVkZVwiOiBwbGFjZVswXS5nZW9tZXRyeS5sb2NhdGlvbi5sbmcoKVxuICAgIC8vICAgICAgICAgICAgIH0sXG4gICAgLy8gICAgICAgICAgICAgXCJ6b29tXCI6IDE4XG4gICAgLy8gICAgICAgICB9O1xuXG4gICAgLy8gICAgICAgICAkc2NvcGUubWFya2VyID0ge1xuICAgIC8vICAgICAgICAgICAgIGlkOiAwLFxuICAgIC8vICAgICAgICAgICAgIGNvb3Jkczoge1xuICAgIC8vICAgICAgICAgICAgICAgICBsYXRpdHVkZTogcGxhY2VbMF0uZ2VvbWV0cnkubG9jYXRpb24ubGF0KCksXG4gICAgLy8gICAgICAgICAgICAgICAgIGxvbmdpdHVkZTogcGxhY2VbMF0uZ2VvbWV0cnkubG9jYXRpb24ubG5nKClcbiAgICAvLyAgICAgICAgICAgICB9XG4gICAgLy8gICAgICAgICB9O1xuICAgIC8vICAgICB9XG4gICAgLy8gfTtcbiAgICAvLyAkc2NvcGUuc2VhcmNoYm94ID0geyB0ZW1wbGF0ZTogJ3NlYXJjaGJveC50cGwuaHRtbCcsIGV2ZW50czogZXZlbnRzIH07XG5cbiAgICAvLyBjb25zb2xlLmxvZygnRVZFTlRTPycsICRzY29wZS5zZWFyY2hib3gpXG5cbiAgICBhbmd1bGFyLmV4dGVuZCgkc2NvcGUsIHtcbiAgICAgICAgbWFwOiB7XG4gICAgICAgICAgICBjZW50ZXI6IHtcbiAgICAgICAgICAgICAgICBsYXRpdHVkZTogMzguNjI3LFxuICAgICAgICAgICAgICAgIGxvbmdpdHVkZTotOTAuMTk3XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgem9vbTogMTIsXG4gICAgICAgICAgICBtYXJrZXJzOiBbXSxcbiAgICAgICAgICAgIGV2ZW50czoge1xuICAgICAgICAgICAgICAgIGNsaWNrOiBmdW5jdGlvbiAobWFwLCBldmVudE5hbWUsIG1vZGVsLCBvcmlnaW5hbEV2ZW50QXJncywgJHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdoZXkgdGhlcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ01hcmtlciB3YXMgY2xpY2tlZCcgKyBtYXApXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50TmFtZScgKyBldmVudE5hbWUpXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ21vZGVsJyArIG1vZGVsKVxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvcmlnaW5hbEV2ZW50QXJncycgKyBvcmlnaW5hbEV2ZW50QXJncylcblxuICAgICAgICAgICAgICAgICAgICAvLyB2YXIgZSA9IG9yaWdpbmFsRXZlbnRBcmdzWzBdO1xuICAgICAgICAgICAgICAgICAgICAvLyB2YXIgbGF0ID0gZS5sYXRMbmcubGF0KCksbG9uID0gZS5sYXRMbmcubG5nKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHZhciBtYXJrZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBpZDogRGF0ZS5ub3coKSxcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIGNvb3Jkczoge1xuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIGxhdGl0dWRlOiBsYXQsXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgbG9uZ2l0dWRlOiBsb25cbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIC8vIH07XG4gICAgICAgICAgICAgICAgICAgIC8vICRzY29wZS5tYXAubWFya2Vycy5wdXNoKG1hcmtlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgbWFya2VySW5pdCgkc2NvcGUuam9icywgaWRDb3VudGVyLCAkc2NvcGUpO1xuXG4gICAgZnVuY3Rpb24gbWFya2VySW5pdCAoam9icywgaWRDb3VudGVyLCAkc2NvcGUpIHtcbiAgICAgICAgdmFyIGluZm9XaW5kb3dzQXJyYXlzID0gJHNjb3BlLmluZm9XaW5kb3dBcnJheXM7XG5cbiAgICAgICAgam9icy5mb3JFYWNoKGpvYiA9PiB7XG4gICAgICAgICAgICB2YXIgbmV3SW5mb1dpbmRvdyA9IG5ldyBnb29nbGUubWFwcy5JbmZvV2luZG93KHtcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnPGRpdiBpZD1cImNvbnRlbnRcIj4gPGI+JytcbiAgICAgICAgICAgICAgICAnTmFtZSBvZiBFbXBsb3llcjogPC9iPicgKyBqb2IuZW1wbG95ZXIgK1xuICAgICAgICAgICAgJzwvZGl2PicrJzxkaXYgPjxiPicrXG4gICAgICAgICAgICAgICAgJ0Rlc2NyaXB0aW9uOiA8L2I+JyArIGpvYi5kZXNjcmlwdGlvbiArXG4gICAgICAgICAgICAnPC9kaXY+JysnPGRpdiA+IDxiPicrXG4gICAgICAgICAgICAgICAgJ0luZHVzdHJ5OiA8L2I+JyArIGpvYi5pbmR1c3RyeSArXG4gICAgICAgICAgICAnPC9kaXY+J1xuICAgICAgICAgICAgLFxuICAgICAgICAgICAgICAgIG1heFdpZHRoOiAyMDBcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBpbmZvV2luZG93c0FycmF5cy5wdXNoKG5ld0luZm9XaW5kb3cpXG5cbiAgICAgICAgICAgIHZhciBtYXJrZXIgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IGlkQ291bnRlcixcbiAgICAgICAgICAgICAgICBjb29yZHM6IHtcbiAgICAgICAgICAgICAgICAgICAgbGF0aXR1ZGU6IGpvYi5sYXRpdHVkZSxcbiAgICAgICAgICAgICAgICAgICAgbG9uZ2l0dWRlOiBqb2IubG9uZ2l0dWRlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtYXJrZXJFdmVudHM6IHtcbiAgICAgICAgICAgICAgICAgICAgY2xpY2s6IGZ1bmN0aW9uIChtYXJrZXIsIGV2ZW50TmFtZSwgbW9kZWwsIG9yaWdpbmFsRXZlbnRBcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaGVyZXMgaW5mb1dpbmRvd0FycmF5cyAsJywgaW5mb1dpbmRvd3NBcnJheXNbbW9kZWwuaWRLZXldKVxuICAgICAgICAgICAgICAgICAgICAgICAgaW5mb1dpbmRvd3NBcnJheXNbbW9kZWwuaWRLZXldLm9wZW4obW9kZWwubWFwLG1hcmtlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnTWFya2VyIHdhcyBjbGlja2VkJywgbWFya2VyKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ2hlcmVzIHRoaXMgJywgdGhpcylcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdldmVudE5hbWUnLCBldmVudE5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnbW9kZWwnLCBtb2RlbClcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdvcmlnaW5hbEV2ZW50QXJncycsIG9yaWdpbmFsRXZlbnRBcmdzKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ2hlcmVzIHRoZSB2YXIgaW5mb1dpbmRvd3NBcnJheXMgY2xpY2sgZXZlbnQgaW4gbWFya2VyJywgaW5mb1dpbmRvd3NBcnJheXMpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICRzY29wZS5tYXAubWFya2Vycy5wdXNoKG1hcmtlcik7XG4gICAgICAgICAgICBpZENvdW50ZXIrKztcbiAgICAgICAgfSlcbiAgICB9XG5cbn0pXG5cbmFwcC5mYWN0b3J5KCdqb2JMb2NzRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcbiAgICB2YXIgam9iTG9jc0ZhY3RvcnkgPSB7fTtcblxuICAgIGpvYkxvY3NGYWN0b3J5LmdldEpvYnMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2pvYkxvY3MnKVxuICAgICAgICAudGhlbihyZXMgPT4gcmVzLmRhdGEpXG4gICAgfVxuXG4gICAgam9iTG9jc0ZhY3RvcnkucG9zdE5ld0pvYiA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL2pvYkxvY3MnKVxuICAgIH1cbiAgICByZXR1cm4gam9iTG9jc0ZhY3Rvcnk7XG59KVxuXG5hcHAuY29uZmlnKGZ1bmN0aW9uKHVpR21hcEdvb2dsZU1hcEFwaVByb3ZpZGVyKSB7XG4gICAgdWlHbWFwR29vZ2xlTWFwQXBpUHJvdmlkZXIuY29uZmlndXJlKHtcbiAgICAgICAga2V5OiAnQUl6YVN5QWROM1RmRTEza3hPRkJSY2dPUWlSU3NTczFfVEZseThzJyxcbiAgICAgICAgdjogJzMuMjAnLCAvL2RlZmF1bHRzIHRvIGxhdGVzdCAzLlggYW55aG93XG4gICAgICAgIGxpYnJhcmllczogJ3dlYXRoZXIsZ2VvbWV0cnksdmlzdWFsaXphdGlvbidcbiAgICB9KTtcbn0pXG4iLCIvLyBhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuLy8gICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuLy8gICAgICAgICB1cmw6ICcvJyxcbi8vICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCdcbi8vICAgICB9KTtcbi8vIH0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUubG9naW4gPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJzxpbWcgbmctcmVwZWF0PVwiaXRlbSBpbiBzdGFzaFwiIHdpZHRoPVwiMzAwXCIgbmctc3JjPVwie3sgaXRlbSB9fVwiIC8+JyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgU2VjcmV0U3Rhc2gpIHtcbiAgICAgICAgICAgIFNlY3JldFN0YXNoLmdldFN0YXNoKCkudGhlbihmdW5jdGlvbiAoc3Rhc2gpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3Rhc2ggPSBzdGFzaDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdQaWNzJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgICdodHRwczovL2ZhYmlhbmRlbWJza2kuZmlsZXMud29yZHByZXNzLmNvbS8yMDE1LzAzL3VzZXJzLWZhYmlhbnAtZG9jdW1lbnRzLWpvYnMtYXJjaC1zaGloLW5ldWVyLW9yZG5lci1pbnN0YWxsYXRpb242LmpwZz93PTY0MCZoPTM5MiZjcm9wPTEnLFxuICAgICAgICAnaHR0cDovL2JlYXR0aGU5dG81LmNvbS93cC1jb250ZW50L3VwbG9hZHMvMjAxMi8wOC9qb2ItU2VhcmNoLTEuanBnJyxcbiAgICAgICAgJ2h0dHA6Ly9ocGN2dC5vcmcvd3AtY29udGVudC91cGxvYWRzLzIwMTQvMDIvaGFuZHMtaG9sZGluZy1ob3VzZS1pbWFnZS5qcGcnLFxuICAgIF07XG59KTtcbiIsImFwcC5jb250cm9sbGVyKCdMb29rdXBDdGwnLCBmdW5jdGlvbigkc2NvcGUpIHtcblx0JHNjb3BlLmdldENsaWVudEluZm8gPSBmdW5jdGlvbigpe1xuXHR9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnYmFzaWNpbmZvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvYmFzaWNJbmZvL2Jhc2ljaW5mby5odG1sJ1xuICAgIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2Z1bGxzdGFja0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5odG1sJ1xuICAgIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ21pc3Npbmdmb3JtcycsIGZ1bmN0aW9uICgkaHR0cCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiBmYWxzZSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9taXNzaW5nZm9ybXMvbWlzc2luZ2Zvcm1zLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSl7XG4gICAgICAgICAgY29uc29sZS5sb2coc2NvcGUpO1xuICAgICAgICAgIHNjb3BlLmdldEJDID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdoZWxsbycpO1xuICAgICAgICAgICAgd2luZG93Lm9wZW4oYC9hcGkvZm9ybXMvYmlydGgtY2VydGlmaWNhdGUvY29tcGxldGU/Zmlyc3RuYW1lPSR7c2NvcGUuY3VycmVudFBlcnNvbi5GaXJzdF9OYW1lfSZsYXN0bmFtZT0ke3Njb3BlLmN1cnJlbnRQZXJzb24uTGFzdF9OYW1lfSZET0I9JHtzY29wZS5jdXJyZW50UGVyc29uLkRPQn1gKVxuXG4gICAgICAgICAgfVxuICAgICAgICAgIHNjb3BlLmdldFNTQyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaGVsbG8nKTtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKGAvYXBpL2Zvcm1zL2JpcnRoLWNlcnRpZmljYXRlL2NvbXBsZXRlP2ZpcnN0bmFtZT0ke3Njb3BlLmN1cnJlbnRQZXJzb24uRmlyc3RfTmFtZX0mbGFzdG5hbWU9JHtzY29wZS5jdXJyZW50UGVyc29uLkxhc3RfTmFtZX0mRE9CPSR7c2NvcGUuY3VycmVudFBlcnNvbi5ET0J9YCk7XG5cblxuICAgICAgICAgIH1cbiAgICAgICAgICBzY29wZS5nZXRGUyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB3aW5kb3cub3BlbihgL2FwaS9mb3Jtcy9mb29kLXN0YW1wcy9jb21wbGV0ZT9maXJzdG5hbWU9JHtzY29wZS5jdXJyZW50UGVyc29uLkZpcnN0X05hbWV9Jmxhc3RuYW1lPSR7c2NvcGUuY3VycmVudFBlcnNvbi5MYXN0X05hbWV9JkRPQj0ke3Njb3BlLmN1cnJlbnRQZXJzb24uRE9CfWApO1xuXG4gICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnQWJvdXQnLCBzdGF0ZTogJ2Fib3V0JyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdGb3JtIExpc3QnLCBzdGF0ZTogJ2Zvcm1saXN0JyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdHZXQgU3RhcnRlZCcsIHN0YXRlOiAnc3RhcnQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0pvYnMgTWFwJywgc3RhdGU6ICdqb2JzTWFwJ31cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIl19
