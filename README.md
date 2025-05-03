**************************************
* Local Netlify server start to test *
**************************************

npx netlify-cms-proxy-server

***********
* Run App *
***********
hugo server -D
hugo server -D --disableFastRender

****************************
* local run like on server *
****************************

npx serve public

netlify dev