app.config(function ($stateProvider) {
    $stateProvider.state('start', {
        url: '/start',
        templateUrl: 'js/getStarted/start.html',
        controller: 'StartCtrl'
    });
});

app.controller('StartCtrl', function($scope){
    $scope.checkDB = function(person){
        console.log('here is person info', person)
        //check db for name
        //if person is in db, have them double check their existing info
        //if person is NOT in db, have them enter basic info

        // proceed to instructions for obtaining any missing documentation
    }
})
