<template>
  <div>
    <div class="page-header">
      <h2>数据概览</h2>
    </div>
    
    <div class="stat-cards">
      <div class="stat-card">
        <div class="value">¥{{ dailyStats.total_amount?.toFixed(2) || '0.00' }}</div>
        <div class="label">今日营业额</div>
      </div>
      <div class="stat-card">
        <div class="value">{{ dailyStats.order_count || 0 }}</div>
        <div class="label">今日订单数</div>
      </div>
      <div class="stat-card">
        <div class="value">¥{{ dailyStats.cash_amount?.toFixed(2) || '0.00' }}</div>
        <div class="label">现金收款</div>
      </div>
      <div class="stat-card">
        <div class="value">¥{{ (dailyStats.wechat_amount + dailyStats.alipay_amount)?.toFixed(2) || '0.00' }}</div>
        <div class="label">移动支付</div>
      </div>
    </div>
    
    <el-row :gutter="20">
      <el-col :span="12">
        <div class="table-container">
          <h3 style="margin-bottom: 15px;">库存预警</h3>
          <el-table :data="warningProducts" stripe>
            <el-table-column prop="name" label="商品名称" />
            <el-table-column prop="barcode" label="条码" />
            <el-table-column prop="stock" label="当前库存">
              <template #default="{ row }">
                <el-tag type="danger">{{ row.stock }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="min_stock" label="最低库存" />
          </el-table>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="table-container">
          <h3 style="margin-bottom: 15px;">热销商品TOP10</h3>
          <el-table :data="hotProducts" stripe>
            <el-table-column type="index" label="排名" width="60" />
            <el-table-column prop="name" label="商品名称" />
            <el-table-column prop="total_quantity" label="销售数量" />
            <el-table-column prop="total_amount" label="销售金额">
              <template #default="{ row }">
                ¥{{ row.total_amount?.toFixed(2) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/api'

const dailyStats = ref({})
const warningProducts = ref([])
const hotProducts = ref([])

const loadData = async () => {
  try {
    const [dailyRes, warningRes, hotRes] = await Promise.all([
      request.get('/statistics/daily'),
      request.get('/stock/warning'),
      request.get('/statistics/hot-products')
    ])
    dailyStats.value = dailyRes.data
    warningProducts.value = warningRes.data
    hotProducts.value = hotRes.data
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  loadData()
})
</script>
