export default class AppConfig {
    constructor() {
        this.isBackendInstalled = this.getIsBackendInstalled();
    }

    getIsBackendInstalled() {
        let isBackendInstalled = false;
        $.ajax({
            url: '/isBackendInstalled',
            async: false,
            success: function() {
                isBackendInstalled = true;
            }
        });

        return isBackendInstalled;
    }

    isWSparqlEnabled() {
        return localStorage.getItem('spe.isWSparqlEnabled') === 'true';
    }

    setIsWSparqlEnabled(value) {
        localStorage.setItem('spe.isWSparqlEnabled', value);
    }
}
