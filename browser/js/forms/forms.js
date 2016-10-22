app.config(function ($stateProvider) {

    $stateProvider.state('forms', {
        url: '/forms',
        templateUrl: 'js/forms/forms.html',
    })    
    .state('forms.lookup', {
        url: '/lookup',
        templateUrl: '/js/forms/templates/lookup.html',
        controller: 'LookupCtl'
    })
});