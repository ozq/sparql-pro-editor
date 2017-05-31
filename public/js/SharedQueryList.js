class SharedQueryList extends QueryList {
    buildButtons() {
        var baseButtons = super.buildButtons();
        return baseButtons + "<i class='fa fa-link buttonGetQueryLink' aria-hidden='true' title='Copy link'></i>";
    }

    handleButtonsClick() {
        super.handleButtonsClick();
        this.element.on('click', '.buttonGetQueryLink', function() {
            var id = $(this).closest('.query-item').data('id');
            QueryShare.share(id);
        });
    }
}
