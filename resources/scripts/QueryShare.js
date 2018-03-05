export default class QueryShare {
    static share(id) {
        let sharedUrl = window.location.origin + window.location.pathname + '?' + $.param({sharedQueryId: id});
        let temp = $('<input>');
        $('body').append(temp);
        temp.val(sharedUrl).select();
        document.execCommand('copy');
        temp.remove();

        $.notify(
            '<strong>Link has been copied to buffer.</strong><br>' + sharedUrl,
            {
                type: 'success',
                placement: {
                    from: 'bottom',
                    align: 'right'
                }
            }
        );
    }

    static getSharedQueryId() {
        $.urlParam = function(name) {
            let results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
            return results ? results[1] || 0 : null;
        };

        return $.urlParam('sharedQueryId');
    }
}
