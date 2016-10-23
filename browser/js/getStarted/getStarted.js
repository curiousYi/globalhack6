app.config(function ($stateProvider) {
    $stateProvider.state('start', {
        url: '/start',
        templateUrl: 'js/getStarted/start.html',
        controller: 'StartCtrl'
    });
});

app.controller('StartCtrl', function($scope, $http){

    $scope.options = [
        {value: '', label: 'choose one'},
        {value: true, label: 'true'}, 
        {value: false, label: 'false'}
    ];

    $scope.updatingInfo = function(){
        var information = {
            firstName: $scope.currentPerson.firstName, 
            lastName: $scope.currentPerson.lastName, 
            SSN: $scope.currentPerson.SSN,
            DOB: $scope.currentPerson.DOB,
            gender: $scope.currentPerson.gender,
            race: $scope.currentPerson.race,
            veteranStatus: $scope.currentPerson.veteranStatus,
            phone: $scope.currentPerson.phone
        }
        if ($scope.needsPost) {
            $http.post('api/clients', information)
            .then(function(person){
                $scope.updatedPerson = person.data;
            })
        } else {
            $http.put('api/clients', information)
            .then(function(person){
                $scope.updatedPerson = person.data;
            })
        }
        $scope.showForms = true; 
        $('html,body').animate({scrollTop: $(document).height() }, 1000);
    };

    $scope.checkDB = function(person){
        $http.get('/api/clients', {
            params: {
                firstName: person.firstName, 
                lastName: person.lastName,
                DOB: person.DOB
            }
        })
        .then(function(person){
            if (person.data.id){
                $scope.currentPerson = person.data;
                $scope.needsPut = true; 
            } else {
                $scope.needsPost = true; 
            }
            $scope.isCurrentPerson = true;
        })
        .then(function(){
            $('html,body').animate({scrollTop: $(document).height() }, 1000);
        })
        .catch(function(error){
            console.error("ERR", error)
        })
    }
})
