console.log("Running")
var switchStatus = false;
$("#togBtn").on('change', function() {
    console.log("Entered")
    switchStatus = $(this).is(':checked');
    console.log(switchStatus);// To verify
});

/*console.log("Running")
var button_style_src = '<style name="framescrape_styles">.fs_button {background-color: rgb(103, 144, 231);border: none;color: white;padding: 4px 15px;text-align: center;font-size: 10px;cursor: pointer;}.fs_button:hover {background-color: rgb(28, 85, 209);}</style>'
var button_src = '<button >ADD TO DB</button>'
$(document).ready(
    function(){
        $('#top-level-buttons.style-scope.ytd-menu-renderer').prepend(button_src);
    });
$(document).ready(
    function(){
        $('html, head').prepend(button_style_src);
    });
*/

