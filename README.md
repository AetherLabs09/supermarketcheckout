Repo-Query-BCS-CY-17-超市收银系统/
├── Dockerfile                    # Docker镜像构建文件
└── repo/
    ├── backend/                  # 后端代码
    │   ├── package.json
    │   ├── server.js            # Express服务器主入口
    │   └── database/
    │       └── init.sql         # 数据库初始化脚本
    └── frontend/                 # 前端代码
        ├── package.json
        ├── vite.config.js
        ├── index.html
        └── src/
            ├── main.js
            ├── App.vue
            ├── router/index.js   # 路由配置
            ├── store/user.js     # 用户状态管理
            ├── api/index.js      # API请求封装
            ├── styles/index.css  # 全局样式
            └── views/
                ├── Login.vue     # 登录页面
                ├── Cashier.vue   # 收银台
                ├── Admin.vue     # 后台布局
                └── admin/
                    ├── Dashboard.vue    # 数据概览
                    ├── Products.vue     # 商品管理
                    ├── Members.vue      # 会员管理
                    ├── Stock.vue        # 库存管理
                    ├── Orders.vue       # 订单管理
                    ├── Statistics.vue   # 统计分析
                    └── Users.vue        # 用户管理
  用户名
密码
角色
admin
123456
管理员
cashier1
123456
收银员
cashier2
123456
收银员

## 功能特性
1. 员工登录/权限管理 - 收银员和管理员分角色登录，权限分离
2. 商品扫码收银 - 支持扫码枪和手动输入条码
3. 购物车操作 - 添加、删除、修改数量、清空、抹零/四舍五入
4. 多种支付方式 - 现金、微信、支付宝、会员卡
5. 小票打印 - 自动生成收银小票，支持预览和打印
6. 商品后台管理 - 增删改查商品、分类、条码录入
7. 会员管理 - 注册、充值、积分、等级折扣
8. 库存管理 - 自动扣减、预警、入库、流水记录
9. 订单查询 - 按日期、收银员、订单号查询，支持作废
10. 数据统计 - 日/月营业额、热销排行、分类销售
