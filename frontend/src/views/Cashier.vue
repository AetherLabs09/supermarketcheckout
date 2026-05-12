<template>
  <div class="cashier-container">
    <div class="cashier-header">
      <div class="left">
        <h2>超市收银系统</h2>
      </div>
      <div class="center">
        <el-input ref="barcodeInput" v-model="barcodeInput" placeholder="扫码或输入商品条码" style="width: 300px;" @keyup.enter="handleBarcodeInput">
          <template #prefix>
            <el-icon><Scan /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="right">
        <span style="margin-right: 20px;">收银员：{{ userStore.user?.name }}</span>
        <el-button v-if="userStore.user?.role === 'admin'" type="primary" text @click="router.push('/admin')">后台管理</el-button>
        <el-button type="danger" text @click="handleLogout">退出</el-button>
      </div>
    </div>
    
    <div class="cashier-main">
      <div class="product-list">
        <div style="padding: 15px; background: white; border-bottom: 1px solid #eee;">
          <el-input v-model="searchKeyword" placeholder="搜索商品" style="width: 200px; margin-right: 10px;" @keyup.enter="searchProducts" />
          <el-select v-model="selectedCategory" placeholder="选择分类" clearable style="width: 150px;" @change="searchProducts">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </div>
        <div class="product-grid">
          <div v-for="product in products" :key="product.id" class="product-card" @click="addToCart(product)">
            <div class="name">{{ product.name }}</div>
            <div class="price">¥{{ product.sale_price.toFixed(2) }}</div>
            <div class="stock">库存: {{ product.stock }} {{ product.unit }}</div>
          </div>
        </div>
      </div>
      
      <div class="cart-panel">
        <div class="cart-header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold;">购物车 ({{ cart.length }}件商品)</span>
            <el-button type="danger" size="small" @click="clearCart">清空</el-button>
          </div>
        </div>
        
        <div class="cart-items">
          <div v-for="(item, index) in cart" :key="index" class="cart-item">
            <div class="info">
              <div class="name">{{ item.product_name }}</div>
              <div class="price">¥{{ item.unit_price.toFixed(2) }} × {{ item.quantity }}</div>
            </div>
            <el-input-number v-model="item.quantity" :min="1" :max="item.maxStock" size="small" style="width: 100px;" @change="updateCartTotal" />
            <span style="font-weight: bold; color: #f56c6c; width: 70px; text-align: right;">¥{{ item.subtotal.toFixed(2) }}</span>
            <el-button type="danger" size="small" circle @click="removeFromCart(index)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-empty v-if="cart.length === 0" description="购物车为空" />
        </div>
        
        <div class="cart-footer">
          <div style="margin-bottom: 10px;">
            <el-input v-model="memberPhone" placeholder="输入会员手机号" style="width: 150px;" @keyup.enter="searchMember">
              <template #append>
                <el-button @click="searchMember">查询</el-button>
              </template>
            </el-input>
            <span v-if="currentMember" style="margin-left: 10px; color: #409eff;">
              会员: {{ currentMember.name }} (余额: ¥{{ currentMember.balance.toFixed(2) }}, 积分: {{ currentMember.points }})
            </span>
          </div>
          
          <div class="total-section">
            <div class="total-row">
              <span>商品数量:</span>
              <span>{{ totalQuantity }}件</span>
            </div>
            <div class="total-row">
              <span>商品金额:</span>
              <span>¥{{ totalAmount.toFixed(2) }}</span>
            </div>
            <div v-if="memberDiscount > 0" class="total-row">
              <span>会员优惠:</span>
              <span style="color: #67c23a;">-¥{{ memberDiscount.toFixed(2) }}</span>
            </div>
            <div class="total-row final">
              <span>应收金额:</span>
              <span>¥{{ finalAmount.toFixed(2) }}</span>
            </div>
          </div>
          
          <div style="margin-bottom: 10px;">
            <el-radio-group v-model="roundType" size="small">
              <el-radio-button label="none">不抹零</el-radio-button>
              <el-radio-button label="floor">抹零(向下)</el-radio-button>
              <el-radio-button label="round">四舍五入</el-radio-button>
            </el-radio-group>
          </div>
          
          <div class="payment-buttons">
            <el-button type="success" :disabled="cart.length === 0" @click="handlePayment('cash')">
              <el-icon><Money /></el-icon> 现金收款
            </el-button>
            <el-button type="primary" :disabled="cart.length === 0" @click="handlePayment('wechat')">
              <el-icon><ChatDotRound /></el-icon> 微信支付
            </el-button>
            <el-button type="warning" :disabled="cart.length === 0" @click="handlePayment('alipay')">
              <el-icon><Wallet /></el-icon> 支付宝
            </el-button>
            <el-button type="info" :disabled="cart.length === 0 || !currentMember" @click="handlePayment('member')">
              <el-icon><User /></el-icon> 会员卡
            </el-button>
          </div>
        </div>
      </div>
    </div>
    
    <el-dialog v-model="paymentDialog" title="收款结算" width="400px">
      <el-form label-width="100px">
        <el-form-item label="应收金额">
          <span style="font-size: 24px; color: #f56c6c; font-weight: bold;">¥{{ displayFinalAmount.toFixed(2) }}</span>
        </el-form-item>
        <el-form-item v-if="paymentMethod === 'cash'" label="收款金额">
          <el-input-number v-model="receivedAmount" :min="displayFinalAmount" :precision="2" :step="1" style="width: 200px;" />
        </el-form-item>
        <el-form-item v-if="paymentMethod === 'cash'" label="找零">
          <span style="font-size: 18px; color: #67c23a; font-weight: bold;">¥{{ changeAmount.toFixed(2) }}</span>
        </el-form-item>
        <el-form-item v-if="paymentMethod === 'member'" label="会员余额">
          <span>¥{{ currentMember?.balance.toFixed(2) }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paymentDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitOrder">确认收款</el-button>
      </template>
    </el-dialog>
    
    <el-dialog v-model="receiptDialog" title="收银小票" width="360px">
      <div class="receipt-modal" ref="receiptRef">
        <div class="receipt-header">
          <h2>超市收银小票</h2>
          <div class="receipt-info">
            <div>订单号: {{ receiptData?.order?.order_no }}</div>
            <div>时间: {{ receiptData?.order?.created_at }}</div>
            <div>收银员: {{ receiptData?.cashier_name }}</div>
          </div>
        </div>
        <div class="receipt-items">
          <div v-for="item in receiptData?.order?.items" :key="item.id" class="receipt-item">
            <span>{{ item.product_name }}</span>
            <span>×{{ item.quantity }}</span>
            <span>¥{{ item.subtotal.toFixed(2) }}</span>
          </div>
        </div>
        <div class="receipt-totals">
          <div class="receipt-total-row">
            <span>商品金额:</span>
            <span>¥{{ receiptData?.order?.total_amount?.toFixed(2) }}</span>
          </div>
          <div v-if="receiptData?.order?.discount_amount > 0" class="receipt-total-row">
            <span>优惠金额:</span>
            <span>-¥{{ receiptData?.order?.discount_amount?.toFixed(2) }}</span>
          </div>
          <div class="receipt-total-row final">
            <span>实收金额:</span>
            <span>¥{{ receiptData?.order?.final_amount?.toFixed(2) }}</span>
          </div>
          <div class="receipt-total-row">
            <span>支付方式:</span>
            <span>{{ paymentMethodText }}</span>
          </div>
          <div v-if="receiptData?.order?.payment_method === 'cash'" class="receipt-total-row">
            <span>收款/找零:</span>
            <span>¥{{ receiptData?.order?.received_amount?.toFixed(2) }} / ¥{{ receiptData?.order?.change_amount?.toFixed(2) }}</span>
          </div>
        </div>
        <div class="receipt-footer">
          <p>谢谢惠顾，欢迎再次光临！</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="receiptDialog = false">关闭</el-button>
        <el-button type="primary" @click="printReceipt">打印小票</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import request from '@/api'

const router = useRouter()
const userStore = useUserStore()

const barcodeInput = ref('')
const searchKeyword = ref('')
const selectedCategory = ref('')
const categories = ref([])
const products = ref([])
const cart = ref([])
const memberPhone = ref('')
const currentMember = ref(null)
const roundType = ref('none')

const paymentDialog = ref(false)
const paymentMethod = ref('cash')
const receivedAmount = ref(0)
const submitting = ref(false)

const receiptDialog = ref(false)
const receiptData = ref(null)
const receiptRef = ref(null)

const totalQuantity = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0))
const totalAmount = computed(() => cart.value.reduce((sum, item) => sum + item.subtotal, 0))
const memberDiscount = computed(() => {
  if (!currentMember.value) return 0
  const discountRate = currentMember.value.level === 3 ? 0.1 : currentMember.value.level === 2 ? 0.05 : 0
  return totalAmount.value * discountRate
})
const finalAmount = computed(() => {
  let amount = totalAmount.value - memberDiscount.value
  if (roundType.value === 'floor') {
    amount = Math.floor(amount)
  } else if (roundType.value === 'round') {
    amount = Math.round(amount)
  }
  return amount
})
const displayFinalAmount = computed(() => {
  let amount = finalAmount.value
  if (paymentMethod.value === 'cash' && roundType.value === 'floor') {
    amount = Math.floor(amount)
  } else if (paymentMethod.value === 'cash' && roundType.value === 'round') {
    amount = Math.round(amount)
  }
  return amount
})
const changeAmount = computed(() => Math.max(0, receivedAmount.value - displayFinalAmount.value))
const paymentMethodText = computed(() => {
  const methods = { cash: '现金', wechat: '微信支付', alipay: '支付宝', member: '会员卡' }
  return methods[paymentMethod.value] || paymentMethod.value
})

const loadProducts = async () => {
  try {
    const res = await request.get('/products', { params: { pageSize: 100 } })
    products.value = res.data.list
  } catch (error) {
    console.error(error)
  }
}

const loadCategories = async () => {
  try {
    const res = await request.get('/categories')
    categories.value = res.data
  } catch (error) {
    console.error(error)
  }
}

const searchProducts = async () => {
  try {
    const res = await request.get('/products', { params: { keyword: searchKeyword.value, category: selectedCategory.value, pageSize: 100 } })
    products.value = res.data.list
  } catch (error) {
    console.error(error)
  }
}

const handleBarcodeInput = async () => {
  if (!barcodeInput.value.trim()) return
  try {
    const res = await request.get(`/products/barcode/${barcodeInput.value.trim()}`)
    if (res.success) {
      addToCart(res.data)
      barcodeInput.value = ''
    }
  } catch (error) {
    ElMessage.error('商品不存在')
  }
}

const addToCart = (product) => {
  if (product.stock <= 0) {
    ElMessage.warning('商品库存不足')
    return
  }
  const existingItem = cart.value.find(item => item.product_id === product.id)
  if (existingItem) {
    if (existingItem.quantity >= product.stock) {
      ElMessage.warning('已达到最大库存')
      return
    }
    existingItem.quantity++
    existingItem.subtotal = existingItem.quantity * existingItem.unit_price
  } else {
    cart.value.push({
      product_id: product.id,
      product_name: product.name,
      barcode: product.barcode,
      quantity: 1,
      unit_price: product.sale_price,
      subtotal: product.sale_price,
      maxStock: product.stock
    })
  }
}

const removeFromCart = (index) => {
  cart.value.splice(index, 1)
}

const updateCartTotal = () => {
  cart.value.forEach(item => {
    item.subtotal = item.quantity * item.unit_price
  })
}

const clearCart = () => {
  if (cart.value.length === 0) return
  ElMessageBox.confirm('确定要清空购物车吗？', '提示', { type: 'warning' }).then(() => {
    cart.value = []
    currentMember.value = null
    memberPhone.value = ''
  }).catch(() => {})
}

const searchMember = async () => {
  if (!memberPhone.value.trim()) return
  try {
    const res = await request.get(`/members/phone/${memberPhone.value.trim()}`)
    currentMember.value = res.data
    ElMessage.success(`会员: ${res.data.name}`)
  } catch (error) {
    ElMessage.error('会员不存在')
    currentMember.value = null
  }
}

const handlePayment = (method) => {
  if (cart.value.length === 0) {
    ElMessage.warning('购物车为空')
    return
  }
  paymentMethod.value = method
  receivedAmount.value = Math.ceil(displayFinalAmount.value)
  paymentDialog.value = true
}

const submitOrder = async () => {
  if (paymentMethod.value === 'member' && currentMember.value.balance < displayFinalAmount.value) {
    ElMessage.error('会员余额不足')
    return
  }
  
  submitting.value = true
  try {
    const orderData = {
      items: cart.value.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        barcode: item.barcode,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal
      })),
      member_id: currentMember.value?.id || null,
      payment_method: paymentMethod.value,
      total_amount: totalAmount.value,
      discount_amount: memberDiscount.value,
      final_amount: displayFinalAmount.value,
      received_amount: paymentMethod.value === 'cash' ? receivedAmount.value : displayFinalAmount.value,
      change_amount: paymentMethod.value === 'cash' ? changeAmount.value : 0,
      round_type: roundType.value
    }
    
    const res = await request.post('/orders', orderData)
    receiptData.value = res.data
    paymentDialog.value = false
    receiptDialog.value = true
    
    cart.value = []
    currentMember.value = null
    memberPhone.value = ''
    loadProducts()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

const printReceipt = () => {
  const printContent = receiptRef.value.innerHTML
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
      <head>
        <title>收银小票</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; }
          .receipt-header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #ccc; }
          .receipt-header h2 { font-size: 18px; margin-bottom: 5px; }
          .receipt-info { font-size: 12px; color: #666; }
          .receipt-items { margin: 15px 0; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
          .receipt-item { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
          .receipt-totals { margin-top: 10px; }
          .receipt-total-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
          .receipt-total-row.final { font-size: 16px; font-weight: bold; }
          .receipt-footer { text-align: center; margin-top: 15px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>${printContent}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' }).then(() => {
    userStore.logout()
    router.push('/login')
  }).catch(() => {})
}

onMounted(() => {
  loadProducts()
  loadCategories()
  nextTick(() => {
    document.querySelector('.cashier-header input')?.focus()
  })
})
</script>
