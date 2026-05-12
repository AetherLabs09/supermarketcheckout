<template>
  <div>
    <div class="page-header">
      <h2>统计分析</h2>
    </div>
    
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="日营业统计" name="daily">
        <div class="search-form">
          <el-form inline>
            <el-form-item label="日期">
              <el-date-picker v-model="dailyDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" @change="loadDailyStats" />
            </el-form-item>
          </el-form>
        </div>
        
        <div class="stat-cards">
          <div class="stat-card">
            <div class="value">¥{{ dailyStats.total_amount?.toFixed(2) || '0.00' }}</div>
            <div class="label">营业额</div>
          </div>
          <div class="stat-card">
            <div class="value">{{ dailyStats.order_count || 0 }}</div>
            <div class="label">订单数</div>
          </div>
          <div class="stat-card">
            <div class="value">¥{{ dailyStats.cash_amount?.toFixed(2) || '0.00' }}</div>
            <div class="label">现金收款</div>
          </div>
          <div class="stat-card">
            <div class="value">¥{{ dailyStats.wechat_amount?.toFixed(2) || '0.00' }}</div>
            <div class="label">微信收款</div>
          </div>
          <div class="stat-card">
            <div class="value">¥{{ dailyStats.alipay_amount?.toFixed(2) || '0.00' }}</div>
            <div class="label">支付宝收款</div>
          </div>
          <div class="stat-card">
            <div class="value">¥{{ dailyStats.member_amount?.toFixed(2) || '0.00' }}</div>
            <div class="label">会员卡收款</div>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="月营业统计" name="monthly">
        <div class="search-form">
          <el-form inline>
            <el-form-item label="年月">
              <el-date-picker v-model="monthValue" type="month" placeholder="选择年月" value-format="YYYY-MM" @change="loadMonthlyStats" />
            </el-form-item>
          </el-form>
        </div>
        
        <div class="stat-cards">
          <div class="stat-card">
            <div class="value">¥{{ monthlyStats.total_amount?.toFixed(2) || '0.00' }}</div>
            <div class="label">月营业额</div>
          </div>
          <div class="stat-card">
            <div class="value">{{ monthlyStats.order_count || 0 }}</div>
            <div class="label">月订单数</div>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="热销商品排行" name="hotProducts">
        <div class="search-form">
          <el-form inline>
            <el-form-item label="日期范围">
              <el-date-picker v-model="hotDateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" @change="loadHotProducts" />
            </el-form-item>
            <el-form-item label="显示数量">
              <el-input-number v-model="hotLimit" :min="5" :max="50" @change="loadHotProducts" />
            </el-form-item>
          </el-form>
        </div>
        
        <div class="table-container">
          <el-table :data="hotProducts" stripe>
            <el-table-column type="index" label="排名" width="60" />
            <el-table-column prop="barcode" label="商品条码" width="150" />
            <el-table-column prop="name" label="商品名称" />
            <el-table-column prop="total_quantity" label="销售数量" width="120" />
            <el-table-column prop="total_amount" label="销售金额" width="150">
              <template #default="{ row }">¥{{ row.total_amount?.toFixed(2) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="分类销售统计" name="category">
        <div class="search-form">
          <el-form inline>
            <el-form-item label="日期范围">
              <el-date-picker v-model="categoryDateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" @change="loadCategoryStats" />
            </el-form-item>
          </el-form>
        </div>
        
        <div class="table-container">
          <el-table :data="categoryStats" stripe>
            <el-table-column prop="category" label="分类" />
            <el-table-column prop="total_quantity" label="销售数量" width="120" />
            <el-table-column prop="total_amount" label="销售金额" width="150">
              <template #default="{ row }">¥{{ row.total_amount?.toFixed(2) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/api'

const activeTab = ref('daily')

const dailyDate = ref(new Date().toISOString().split('T')[0])
const dailyStats = ref({})

const monthValue = ref(new Date().toISOString().slice(0, 7))
const monthlyStats = ref({})

const hotDateRange = ref([])
const hotLimit = ref(10)
const hotProducts = ref([])

const categoryDateRange = ref([])
const categoryStats = ref([])

const loadDailyStats = async () => {
  try {
    const res = await request.get('/statistics/daily', { params: { date: dailyDate.value } })
    dailyStats.value = res.data
  } catch (error) {
    console.error(error)
  }
}

const loadMonthlyStats = async () => {
  if (!monthValue.value) return
  try {
    const [year, month] = monthValue.value.split('-')
    const res = await request.get('/statistics/monthly', { params: { year, month } })
    monthlyStats.value = res.data
  } catch (error) {
    console.error(error)
  }
}

const loadHotProducts = async () => {
  try {
    const params = { limit: hotLimit.value }
    if (hotDateRange.value && hotDateRange.value.length === 2) {
      params.start_date = hotDateRange.value[0]
      params.end_date = hotDateRange.value[1]
    }
    const res = await request.get('/statistics/hot-products', { params })
    hotProducts.value = res.data
  } catch (error) {
    console.error(error)
  }
}

const loadCategoryStats = async () => {
  try {
    const params = {}
    if (categoryDateRange.value && categoryDateRange.value.length === 2) {
      params.start_date = categoryDateRange.value[0]
      params.end_date = categoryDateRange.value[1]
    }
    const res = await request.get('/statistics/category', { params })
    categoryStats.value = res.data
  } catch (error) {
    console.error(error)
  }
}

const handleTabChange = (tab) => {
  if (tab === 'daily') loadDailyStats()
  else if (tab === 'monthly') loadMonthlyStats()
  else if (tab === 'hotProducts') loadHotProducts()
  else if (tab === 'category') loadCategoryStats()
}

onMounted(() => {
  loadDailyStats()
})
</script>
