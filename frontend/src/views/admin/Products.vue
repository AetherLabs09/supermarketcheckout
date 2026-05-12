<template>
  <div>
    <div class="page-header">
      <h2>商品管理</h2>
    </div>
    
    <div class="search-form">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="商品名称/条码" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="searchForm.category" placeholder="选择分类" clearable>
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="table-container">
      <div style="margin-bottom: 15px;">
        <el-button type="primary" @click="handleAdd">新增商品</el-button>
      </div>
      
      <el-table :data="products" stripe>
        <el-table-column prop="barcode" label="商品条码" width="150" />
        <el-table-column prop="name" label="商品名称" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="cost_price" label="进价" width="100">
          <template #default="{ row }">¥{{ row.cost_price?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="sale_price" label="售价" width="100">
          <template #default="{ row }">¥{{ row.sale_price?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100">
          <template #default="{ row }">
            <el-tag :type="row.stock <= row.min_stock ? 'danger' : 'success'">{{ row.stock }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="min_stock" label="库存预警" width="100" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next" @size-change="loadProducts" @current-change="loadProducts" />
      </div>
    </div>
    
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑商品' : '新增商品'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="商品条码" prop="barcode">
          <el-input v-model="form.barcode" placeholder="请输入商品条码" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="商品分类" prop="category">
          <el-select v-model="form.category" placeholder="选择分类" allow-create filterable>
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="form.unit" placeholder="个/瓶/袋/盒等" />
        </el-form-item>
        <el-form-item label="进价" prop="cost_price">
          <el-input-number v-model="form.cost_price" :precision="2" :min="0" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="售价" prop="sale_price">
          <el-input-number v-model="form.sale_price" :precision="2" :min="0" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input-number v-model="form.stock" :min="0" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="库存预警" prop="min_stock">
          <el-input-number v-model="form.min_stock" :min="0" style="width: 100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api'

const products = ref([])
const categories = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const searchForm = reactive({ keyword: '', category: '' })

const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const submitting = ref(false)

const form = reactive({
  id: null,
  barcode: '',
  name: '',
  category: '',
  unit: '个',
  cost_price: 0,
  sale_price: 0,
  stock: 0,
  min_stock: 10
})

const rules = {
  barcode: [{ required: true, message: '请输入商品条码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  sale_price: [{ required: true, message: '请输入售价', trigger: 'blur' }]
}

const loadProducts = async () => {
  try {
    const res = await request.get('/products', { params: { ...searchForm, page: page.value, pageSize: pageSize.value } })
    products.value = res.data.list
    total.value = res.data.total
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

const handleSearch = () => {
  page.value = 1
  loadProducts()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.category = ''
  page.value = 1
  loadProducts()
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, { id: null, barcode: '', name: '', category: '', unit: '个', cost_price: 0, sale_price: 0, stock: 0, min_stock: 10 })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除商品"${row.name}"吗？`, '提示', { type: 'warning' }).then(async () => {
    await request.delete(`/products/${row.id}`)
    ElMessage.success('删除成功')
    loadProducts()
  }).catch(() => {})
}

const handleSubmit = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await request.put(`/products/${form.id}`, form)
    } else {
      await request.post('/products', form)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadProducts()
    loadCategories()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadProducts()
  loadCategories()
})
</script>
