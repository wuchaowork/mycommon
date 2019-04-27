// 引入koa
const koa = require('koa');
const path = require('path')
const static = require('koa-static');


const app = new koa();
// 配置静态web服务的中间件
app.use(static(path.resolve(__dirname,'./')));
// 监听端口
app.listen(3001,function(){
    console.log('启动成功');
});