var gulp = require("gulp"),
    server = require("browser-sync").create(),
    reload = server.reload,
    clean = require("gulp-clean"),
    scss = require("gulp-sass"),
    minifyCss = require('gulp-clean-css'),
    pump = require('pump'),
    watch = require('gulp-watch'),
    autoprefixer = require("gulp-autoprefixer"),
    runSequence = require("run-sequence"),  // 队列
    fs = require("fs"),
    uglify = require("gulp-uglify"),    // 压缩js
    rev = require("gulp-rev-dxb"),                    // 生成版本号清单
    revCollector = require("gulp-rev-collector-dxb"),   // 替换成版本号文件
    htmlmin = require("gulp-htmlmin"),
    babel = require("gulp-babel"),      // babel
    imagemin = require("gulp-imagemin"),        // 压缩图片

    env = "dev",                        // 环境 dev开发环境  build线上环境
    src = "src/",                       // 源码目录
    distPath = "dist/",                 // 产出目录
    port = 3000;                        // 端口号



// 清除dist目录下所有文件
gulp.task("clean", function(callback){
    console.info(`清除dist`);
    return gulp.src([distPath])
    .pipe(clean())
})

// lib
gulp.task("lib", function(callback){
    console.log(`执行lib`);
    pump([
        gulp.src(src + "lib/**/*"),
        gulp.dest(distPath + "lib/")
    ], callback)
})

// 编译scss文件, 并压缩压缩css文件
gulp.task('scss', function() {
    console.log("执行scss");
    return gulp.src(src + "css/*.scss")
    .pipe(scss())
    .on("error", function(err){  // 解决编译出错,监听被阻断
        console.log("scss_error: ", err.message);
        this.emit('end');
        // this.end(); // 解析scss出错会停止编译
    })
    .pipe(autoprefixer({
        browsers: ['last 20 versions']
    }))
    .pipe(minifyCss())
    .pipe(gulp.dest(distPath + "css/"))

});


// html
gulp.task('html', function() {
    console.log(`执行html`);
    gulp.src(src + '*.html')
        .pipe(htmlmin({
            removeComments: true,  // 清除html里面的注释
            collapseWhitespace: false,   // 压缩html
            minifyJS: true,         // 压缩html页面中的js
            minifyCSS: true         // 压缩html页面的css
        }))
        .pipe(gulp.dest(distPath))
    // pump
});


// js
gulp.task("js", function(callback){
	console.log("执行js");
    pump([
        gulp.src(src + "js/*.js"),
        babel({
            presets: ["@babel/env"],
            plugins: []
        }),
        uglify(),
        gulp.dest(distPath + "js/")
    ], callback)
})


gulp.task("image", function(callback){
    console.log("执行image");
    return gulp.src(src+"images/**")
    .pipe(imagemin({
        optimizationLevel: 5,      //优化等级(取值范围: 0-7)默认: 3
        progressive: true,        //无损压缩jpg图片, 默认false
        interlaced: true,        // 隔行搜啊秒gif进行渲染, 默认:false
        multipass: true         // 多次优化svg直到完全优化, 默认: false
    }))
    .pipe(gulp.dest(distPath+"images/"))
})



// 监视文件修改并重新载入
gulp.task("server", function(){
	server.init({
		server: {
			baseDir: distPath
		},
        port: port
	})
})

// 实时热更新
gulp.task("server_reload", function(){
    server.reload();
})

gulp.task("watch", function(){
    watchFn("*.html", "html");
    watchFn("css/*.scss", "scss");
    watchFn("js/*.js", "js");
    watchFn("images/*", "image");

    // gulp-watch的封装使用 path=>路径 task=>任务名
    function watchFn(path, task){
        watch(src+path, function(){
            // 打包完成后再刷新浏览器
            runSequence(task, "server_reload")
        })
    }
})


// 生成版本号清单
gulp.task("rev", function(){
    return gulp.src([distPath+"css/*.css", distPath+"js/*.js", distPath+"lib/**/*.css", distPath+"lib/**/*.js"])
    .pipe(rev())
    .pipe(rev.manifest())
    .pipe(gulp.dest("./"))
})

// 添加版本号(路径替换)
gulp.task("add_version", function(){
    return gulp.src(["./rev-manifest.json", distPath + "*.html"])
    .pipe(revCollector())
    .pipe(gulp.dest(distPath))
})



// 默认任务(开发环境,服务启动, 并监听文件改变)
gulp.task("default", function(callback){
    setEnv("dev");
    runSequence(
        ["clean"],              // 首先清除dist目录所有文件
        ["lib", "image", "scss", "js", "html"],
        ["server", "watch"],    // 所有文件打包完成,启动服务器
        ["rev"],                // 所有文件打包完成开始生成版本号文件
        ["add_version"],        // 根据清单文件替换html中的引入的资源文件
        callback);
})

function setEnv(type){
    // 生成env.js文件,用于开发页面,判断环境
    env = type || "dev";
    fs.writeFile("./env.js", "export default " + env + ";", function(err){
        console.error(err);
    })
}


// 生产环境(服务启动, 但不监听文件改变)
gulp.task("build", function(callback){
    setEnv("build");
    runSequence(
        ["clean"],          // 首先清除dist目录所有文件
        ["lib", "image", "scss", "js", "html"],
        ["server"],    // 所有文件打包完成,启动服务器
        ["rev"],            // 所有文件打包完成开始生成版本号文件
        ["add_version"],    // 根据清单文件替换html中的引入的资源文件
        callback);
})