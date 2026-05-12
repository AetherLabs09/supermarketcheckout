<template>
  <div>
    <div class="page-header">
      <h2>库存管理</h2>
    </div>
    
    <el-tabs v-model="activeTab">
      <el-tab-pane label="库存流水" name="logs">
        <div class="search-form">
          <el-form inline>
            <el-form-item label="商品">
              <el-input v-model="searchForm.product_id" placeholder="商品ID" clearable />
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="searchForm.type" placeholder="选择类型" clearable>
                <el-option label="入库" value="in" />
                <el-option label="出库" value="out" />
                <el-option label="退货" value="return" />
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
          <el-table :data="logs" stripe>
            <el-table-column prop="created_at" label="时间" width="180">
              <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
            </el-table-column>
            <el-table-column prop="barcode" label="商品条码" width="150" />
            <el-table-column prop="product_name" label="商品名称" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="row.type === 'in' ? 'success' : row.type === 'out' ? 'danger' : 'warning'">
                  {{ row.type === 'in' ? '入库' : row.type === 'out' ? '出库' : '退货' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="100" />
            <el-table-column prop="before_stock" label="变动前" width="100" />
            <el-table-column prop="after_stock" label="变动后" width="100" />
            <el-table-column prop="operator_name" label="操作人" width="100" />
            <el-table-column prop="remark" label="备注" />
          </el-table>
          
          <div class="pagination">
            <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next" @size-change="loadLogs" @current-change="loadLogs" />
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="库存预警" name="warning">
        <div class="table-container">
          <el-table :data="warningProducts" stripe>
            <el-table-column prop="barcode" label="商品条码" width="150" />
            <el-table-column prop="name" label="商品名称" />
            <el-table-column prop="category" label="分类" width="100" />
            <el-table-column prop="stock" label="当前库存" width="100">
              <template #default="{ row }">
                <el-tag type="danger">{{ row.stock }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="min_stock" label="最低库存" width="100" />
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="handleStockIn(row)">入库</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="手动入库" name="stockIn">
        <div class="table-container" style="max-width: 600px;">
          <el-form ref="stockInFormRef" :model="stockInForm" :rules="stockInRules" label-width="100px">
            <el-form-item label="商品" prop="product_id">
              <el-select v-model="stockInForm.product_id" placeholder="选择商品" filterable style="width: 100%;">
                <el-option v-for="p in allProducts" :key="p.id" :label="`${p.barcode} - ${p.name}`" :value="p.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="入库数量" prop="quantity">
              <el-input-number v-model="stockInForm.quantity" :min="1" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="stockInForm.remark" type="textarea" :rows="2" placeholder="入库备注" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="submitting" @click="submitStockIn">确认入库</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api'

const activeTab = ref('logs')
const logs = ref([])
const warningProducts = ref([])
const allProducts = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const searchForm = reactive({ product_id: '', type: '' })
const dateRange = ref([])

const stockInFormRef = ref()
const submitting = ref(false)
const stockInForm = reactive({ product_id: null, quantity: 1, remark: '' })
const stockInRules = {
  product_id: [{ required: true, message: '请选择商品', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

const loadLogs = async () => {
  try {
    const params = { ...searchForm, page: page.value, pageSize: pageSize.value }
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const res = await request.get('/stock/logs', { params })
    logs.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error(error)
  }
}

const loadWarningProducts = async () => {
  try {
    const res = await request.get('/stock/warning')
    warningProducts.value = res.data
  } catch (error) {
    console.error(error)
  }
}

const loadAllProducts = async () => {
  try {
    const res = await request.get('/products', { params: { pageSize: 1000 } })
    allProducts.value = res.data.list
  } catch (error) {
    console.error(error)
  }
}

const handleSearch = () => {
  page.value = 1
  loadLogs()
}

const handleReset = () => {
  searchForm.product_id = ''
  searchForm.type = ''
  dateRange.value = []
  page.value = 1
  loadLogs()
}

const handleStockIn = (product) => {
  activeTab.value = 'stockIn'
  stockInForm.product_id = product.id
  stockInForm.quantity = product.min_stock - product.stock + 10
}

const submitStockIn = async () => {
  await stockInFormRef.value.validate()
  submitting.value = true
  try {
    await request.post('/stock/in', stockInForm)
    ElMessage.success('入库成功')
    stockInForm.product_id = null
    stockInForm.quantity = 1
    stockInForm.remark = ''
    loadLogs()
    loadWarningProducts()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

watch(activeTab, (val) => {
  if (val === 'warning') {
    loadWarningProducts()
  } else if (val === 'stockIn') {
    loadAllProducts()
  }
})

onMounted(() => {
  loadLogs()
  loadAllProducts()
})
</script>
