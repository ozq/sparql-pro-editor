class AppConfig {
    constructor() {
        this.isBackendInstalled = this.getIsBackendInstalled();
    }

    getIsBackendInstalled() {
        var isBackendInstalled = false;
        $.ajax({
            url: '/isBackendInstalled',
            async: false,
            success: function() {
                isBackendInstalled = true;
            }
        });

        return isBackendInstalled;
    }
}

var appConfig = new AppConfig();
