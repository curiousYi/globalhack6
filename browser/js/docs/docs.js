app.config(function ($stateProvider) {
    $stateProvider.state('docs', {
        url: '/governmentforms',
        templateUrl: 'js/docs/docs.html',
        controller: 'FormController'
    });
});

app.controller('FormController', function($scope, $http){
    $scope.getCert = function(){
        $http.get('/api/forms/birth-certificate', {responseType: 'arraybuffer'})
        .success(function(data){
            var file = new Blob([data], {type: 'application/pdf'})
            var fileURL = URL.createObjectURL(file);
            window.open(fileURL);
        })
        .catch(function(error){
            console.error(error)
        })
    }

        $scope.getSocialCert = function(){
        $http.get('/api/forms/social-security', {responseType: 'arraybuffer'})
        .success(function(data){
            var file = new Blob([data], {type: 'application/pdf'})
            var fileURL = URL.createObjectURL(file);
            window.open(fileURL);
        })
        .catch(function(error){
            console.error(error)
        })
    }

})
