app.config(function ($stateProvider) {
    $stateProvider.state('docs', {
        url: '/governmentforms',
        templateUrl: 'js/docs/docs.html',
        controller: 'FormController'
    });
});

app.controller('FormController', function($scope){
    $scope.getBirthCertificate = function(){
        console.log('hi there')
    }
})
