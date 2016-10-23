app.config(function ($stateProvider) {

    $stateProvider.state('jobsMap', {
        url: '/jobs-map',
        templateUrl: './js/googleMaps/googleMaps.html',
        controller: 'jobsMapCtrl',
        resolve: {
            jobs: function(jobLocsFactory){
                return jobLocsFactory.getJobs();
            },
        }
    });

});


app.controller('jobsMapCtrl', function($scope, jobLocsFactory, jobs, uiGmapGoogleMapApi, $http){
    $scope.jobs = jobs; 
    var idCounter = 0;
    $scope.infoWindowArrays = [];

    $scope.addNewJob = function(){
        var infoWindowsArrays = $scope.infoWindowArrays;

        return $http.post('/api/jobLocs', $scope.job)
        .then(function(job){
            console.log('here is new job', job)
            $scope.jobs.push(job.data)
            var newInfoWindow = new google.maps.InfoWindow({
                content: '<div id="content"> <b>'+
                'Name of Employer: </b>' + job.data.employer +
            '</div>'+'<div ><b>'+
                'Description: </b>' + job.data.description +
            '</div>'+'<div > <b>'+
                'Industry: </b>' + job.data.industry +
            '</div>'
            ,
                maxWidth: 200
            })
            infoWindowsArrays.push(newInfoWindow)
            var marker = {
                id: idCounter,
                coords: {
                    latitude: job.data.latitude,
                    longitude: job.data.longitude
                },
                markerEvents: {
                    click: function (marker, eventName, model, originalEventArgs) {
                        infoWindowsArrays[model.idKey].open(model.map,marker);
                    }
                },
            };
            $scope.map.markers.push(marker);
            idCounter++;
            return marker;
        })
        .then(function(marker){
            console.log('NEW MARKER', marker)
            console.log('jobs', $scope.jobs)
            markerInit($scope.jobs, idCounter, $scope);
        })

    }

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
                longitude:-90.197
            },
            zoom: 12,
            markers: [],
            events: {
                click: function (map, eventName, model, originalEventArgs, $scope) {
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
        },
    });

    markerInit($scope.jobs, idCounter, $scope);

    function markerInit (jobs, idCounter, $scope) {
        var infoWindowsArrays = $scope.infoWindowArrays;

        jobs.forEach(job => {
            var newInfoWindow = new google.maps.InfoWindow({
                content: '<div id="content"> <b>'+
                'Name of Employer: </b>' + job.employer +
            '</div>'+'<div ><b>'+
                'Description: </b>' + job.description +
            '</div>'+'<div > <b>'+
                'Industry: </b>' + job.industry +
            '</div>'
            ,
                maxWidth: 200
            })
            infoWindowsArrays.push(newInfoWindow)

            var marker = {
                id: idCounter,
                coords: {
                    latitude: job.latitude,
                    longitude: job.longitude
                },
                markerEvents: {
                    click: function (marker, eventName, model, originalEventArgs) {
                        // console.log('heres infoWindowArrays ,', infoWindowsArrays[model.idKey])
                        infoWindowsArrays[model.idKey].open(model.map,marker);
                        // console.log('Marker was clicked', marker)
                        // console.log('heres this ', this)
                        // console.log('eventName', eventName)
                        // console.log('model', model)
                        // console.log('originalEventArgs', originalEventArgs)
                        // console.log('heres the var infoWindowsArrays click event in marker', infoWindowsArrays)
                    }
                },
            };
            $scope.map.markers.push(marker);
            idCounter++;
        })
    }

})

app.factory('jobLocsFactory', function($http){
    var jobLocsFactory = {};

    jobLocsFactory.getJobs = function(){
        return $http.get('/api/jobLocs')
        .then(res => res.data)
    }

    jobLocsFactory.postNewJob = function(){
        return $http.post('/api/jobLocs')
    }
    return jobLocsFactory;
})

app.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyAdN3TfE13kxOFBRcgOQiRSsSs1_TFly8s',
        v: '3.20', //defaults to latest 3.X anyhow
        libraries: 'weather,geometry,visualization'
    });
})
