
let map = document.getElementById("map");

let pieces = [];
let lines = [];
let connections = [];

// 1. 创建9张地图碎片
for (let i = 1; i <= 9; i++) {

    let img = document.createElement("img");
    let number = String(i).padStart(2, "0");

    img.src = "images/map" + number + ".png";
    img.className = "piece";

    map.appendChild(img);
    pieces.push(img);
}

// 2. 创建19张原始连接线
for (let i = 1; i <= 19; i++) {

    let img = document.createElement("img");
    let number = String(i).padStart(2, "0");

    img.src = "images/line" + number + ".png";
    img.className = "line";

    map.appendChild(img);
    lines.push(img);
}

// 3. 随机排列地图
function rearrange() {

    for (let i = 0; i < pieces.length; i++) {

        let x = 10 + Math.random() * 80;
        let y = 10 + Math.random() * 80;

        pieces[i].style.left = x + "%";
        pieces[i].style.top = y + "%";
    }

    makeConnections();
}

// 4. 随机生成19组连接关系
function makeConnections() {

    connections = [];

    for (let i = 0; i < 19; i++) {

        let a = Math.floor(Math.random() * 9);
        let b = Math.floor(Math.random() * 9);

        // 避免连接自己
        while (a === b) {
            b = Math.floor(Math.random() * 9);
        }

        connections.push([a, b]);
    }
}

// 5. 更新每条线的位置、长度和角度
function updateLines() {

    let mapRect = map.getBoundingClientRect();

    for (let i = 0; i < lines.length; i++) {

        let a = pieces[connections[i][0]];
        let b = pieces[connections[i][1]];

        let rectA = a.getBoundingClientRect();
        let rectB = b.getBoundingClientRect();

        // 两张地图的中心位置
        let x1 = rectA.left + rectA.width / 2 - mapRect.left;
        let y1 = rectA.top + rectA.height / 2 - mapRect.top;

        let x2 = rectB.left + rectB.width / 2 - mapRect.left;
        let y2 = rectB.top + rectB.height / 2 - mapRect.top;

        // 计算两点之间的距离
        let dx = x2 - x1;
        let dy = y2 - y1;

        let distance = Math.sqrt(dx * dx + dy * dy);

        // 计算旋转角度
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;

        // 更新线条图片
        lines[i].style.left = x1 + "px";
        lines[i].style.top = y1 + "px";
        lines[i].style.width = distance + "px";
        lines[i].style.transform =
            "translateY(-50%) rotate(" + angle + "deg)";
    }

    requestAnimationFrame(updateLines);
}

// 6. 点击网页重新排列
document.addEventListener("click", rearrange);

// 7. 初始化
rearrange();
updateLines();
