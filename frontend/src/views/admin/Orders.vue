<template>
  <div>
    <div class="page-header">
      <h2>订单管理</h2>
    </div>
    
    <div class="search-form">
      <el-form inline>
        <el-form-item label="订单号">
          <el-input v-model="searchForm.order_no" placeholder="订单号" clearable />
        </el-form-item>
        <el-form-item label="收银员">
          <el-select v-model="searchForm.cashier_id" placeholder="选择收银员" clearable>
            <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="table-container">
      <el-table :data="orders" stripe>
        <el-table-column prop="order_no" label="订单号" width="200" />
        <el-table-column prop="created_at" label="下单时间" width="180">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="cashier_name" label="收银员" width="100" />
        <el-table-column prop="member_name" label="会员" width="100">
          <template #default="{ row }">{{ row.member_name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="total_amount" label="商品金额" width="100">
          <template #default="{ row }">¥{{ row.total_amount?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="discount_amount" label="优惠金额" width="100">
          <template #default="{ row }">¥{{ row.discount_amount?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="final_amount" label="实收金额" width="100">
          <template #default="{ row }">
            <span style="color: #f56c6c; font-weight: bold;">¥{{ row.final_amount?.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="payment_method" label="支付方式" width="100">
          <template #default="{ row }">
            <el-tag :type="paymentMethodType(row.payment_method)">{{ paymentMethodText(row.payment_method) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'completed' ? 'success' : 'info'">
              {{ row.status === 'completed' ? '已完成' : '已作废' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'completed'" type="danger" size="small" link @click="handleVoid(row)">作废</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next" @size-change="loadOrders" @current-change="loadOrders" />
      </div>
    </div>
    
    <el-dialog v-model="detailDialog" title="订单详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="订单号">{{ currentOrder?.order_no }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ formatDate(currentOrder?.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="收银员">{{ currentOrder?.cashier_name }}</el-descriptions-item>
        <el-descriptions-item label="会员">{{ currentOrder?.member_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ paymentMethodText(currentOrder?.payment_method) }}</el-descriptions-item>
        <el-descriptions-item label="订单状态">
          <el-tag :type="currentOrder?.status === 'completed' ? 'success' : 'info'">
            {{ currentOrder?.status === 'completed' ? '已完成' : '已作废' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      
      <h4 style="margin: 20px 0 10px;">商品明细</h4>
      <el-table :data="currentOrder?.items" stripe size="small">
        <el-table-column prop="product_name" label="商品名称" />
        <el-table-column prop="barcode" label="条码" width="130" />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="unit_price" label="单价" width="100">
          <template #default="{ row }">¥{{ row.unit_price?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="subtotal" label="小计" width="100">
          <template #default="{ row }">¥{{ row.subtotal?.toFixed(2) }}</template>
        </el-table-column>
      </el-table>
      
      <div style="margin-top: 15px; text-align: right;">
        <div>商品金额: ¥{{ currentOrder?.total_amount?.toFixed(2) }}</div>
        <div v-if="currentOrder?.discount_amount > 0">优惠金额: -¥{{ currentOrder?.discount_amount?.toFixed(2) }}</div>
        <div style="font-size: 18px; font-weight: bold; color: #f56c6c;">实收金额: ¥{{ currentOrder?.final_amount?.toFixed(2) }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api'

const orders = ref([])
const users = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const searchForm = reactive({ order_no: '', cashier_id: '' })
const dateRange = ref([])

const detailDialog = ref(false)
const currentOrder = ref(null)

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

const paymentMethodText = (method) => {
  const methods = { cash: '现金', wechat: '微信', alipay: '支付宝', member: '会员卡' }
  return methods[method] || method
}

const paymentMethodType = (method) => {
  const types = { cash: 'warning', wechat: 'success', alipay: 'primary', member: 'info' }
  return types[method] || ''
}

const loadOrders = async () => {
  try {
    const params = { ...searchForm, page: page.value, pageSize: pageSize.value }
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const res = await request.get('/orders', { params })
    orders.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error(error)
  }
}

const loadUsers = async () => {
  try {
    const res = await request.get('/users')
    users.value = res.data
  } catch (error) {
    console.error(error)
  }
}

const handleSearch = () => {
  page.value = 1
  loadOrders()
}

const handleReset = () => {
  searchForm.order_no = ''
  searchForm.cashier_id = ''
  dateRange.value = []
  page.value = 1
  loadOrders()
}

const handleDetail = async (row) => {
  try {
    const res = await request.get(`/orders/${row.id}`)
    currentOrder.value = res.data
    detailDialog.value = true
  } catch (error) {
    console.error(error)
  }
}

const handleVoid = (row) => {
  ElMessageBox.confirm(`确定要作废订单"${row.order_no}"吗？作废后库存将自动退回。`, '提示', { type: 'warning' }).then(async () => {
    await request.post(`/orders/${row.id}/void`)
    ElMessage.success('订单已作废')
    loadOrders()
  }).catch(() => {})
}

onMounted(() => {
  loadOrders()
  loadUsers()
})
</script>
