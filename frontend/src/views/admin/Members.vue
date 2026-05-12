<template>
  <div>
    <div class="page-header">
      <h2>会员管理</h2>
    </div>
    
    <div class="search-form">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="姓名/手机号/卡号" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="table-container">
      <div style="margin-bottom: 15px;">
        <el-button type="primary" @click="handleAdd">新增会员</el-button>
      </div>
      
      <el-table :data="members" stripe>
        <el-table-column prop="card_no" label="会员卡号" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="level" label="等级" width="80">
          <template #default="{ row }">
            <el-tag :type="row.level === 3 ? 'danger' : row.level === 2 ? 'warning' : 'info'">
              {{ ['普通', '银卡', '金卡'][row.level - 1] || '普通' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="points" label="积分" width="100" />
        <el-table-column prop="balance" label="余额" width="120">
          <template #default="{ row }">¥{{ row.balance?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="success" size="small" link @click="handleRecharge(row)">充值</el-button>
            <el-button type="warning" size="small" link @click="handlePoints(row)">积分</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next" @size-change="loadMembers" @current-change="loadMembers" />
      </div>
    </div>
    
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑会员' : '新增会员'" width="450px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="会员等级" prop="level">
          <el-select v-model="form.level" style="width: 100%;">
            <el-option label="普通会员" :value="1" />
            <el-option label="银卡会员" :value="2" />
            <el-option label="金卡会员" :value="3" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
    
    <el-dialog v-model="rechargeDialog" title="会员充值" width="400px">
      <el-form label-width="80px">
        <el-form-item label="会员">
          <span>{{ currentMember?.name }} ({{ currentMember?.phone }})</span>
        </el-form-item>
        <el-form-item label="当前余额">
          <span>¥{{ currentMember?.balance?.toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="充值金额">
          <el-input-number v-model="rechargeAmount" :precision="2" :min="0" style="width: 200px;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitRecharge">确定充值</el-button>
      </template>
    </el-dialog>
    
    <el-dialog v-model="pointsDialog" title="积分调整" width="400px">
      <el-form label-width="80px">
        <el-form-item label="会员">
          <span>{{ currentMember?.name }} ({{ currentMember?.phone }})</span>
        </el-form-item>
        <el-form-item label="当前积分">
          <span>{{ currentMember?.points }}</span>
        </el-form-item>
        <el-form-item label="调整类型">
          <el-radio-group v-model="pointsType">
            <el-radio label="add">增加积分</el-radio>
            <el-radio label="subtract">扣减积分</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="积分数量">
          <el-input-number v-model="pointsAmount" :min="0" style="width: 200px;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pointsDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitPoints">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api'

const members = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const searchForm = reactive({ keyword: '' })

const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const submitting = ref(false)

const form = reactive({ id: null, name: '', phone: '', level: 1 })

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }]
}

const rechargeDialog = ref(false)
const pointsDialog = ref(false)
const currentMember = ref(null)
const rechargeAmount = ref(0)
const pointsAmount = ref(0)
const pointsType = ref('add')

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

const loadMembers = async () => {
  try {
    const res = await request.get('/members', { params: { ...searchForm, page: page.value, pageSize: pageSize.value } })
    members.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error(error)
  }
}

const handleSearch = () => {
  page.value = 1
  loadMembers()
}

const handleReset = () => {
  searchForm.keyword = ''
  page.value = 1
  loadMembers()
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, { id: null, name: '', phone: '', level: 1 })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, { id: row.id, name: row.name, phone: row.phone, level: row.level })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await request.put(`/members/${form.id}`, form)
    } else {
      await request.post('/members', form)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadMembers()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

const handleRecharge = (row) => {
  currentMember.value = row
  rechargeAmount.value = 0
  rechargeDialog.value = true
}

const submitRecharge = async () => {
  if (rechargeAmount.value <= 0) {
    ElMessage.warning('请输入充值金额')
    return
  }
  submitting.value = true
  try {
    await request.post(`/members/${currentMember.value.id}/recharge`, { amount: rechargeAmount.value })
    ElMessage.success('充值成功')
    rechargeDialog.value = false
    loadMembers()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

const handlePoints = (row) => {
  currentMember.value = row
  pointsAmount.value = 0
  pointsType.value = 'add'
  pointsDialog.value = true
}

const submitPoints = async () => {
  if (pointsAmount.value <= 0) {
    ElMessage.warning('请输入积分数量')
    return
  }
  submitting.value = true
  try {
    await request.post(`/members/${currentMember.value.id}/points`, { points: pointsAmount.value, type: pointsType.value })
    ElMessage.success('调整成功')
    pointsDialog.value = false
    loadMembers()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadMembers()
})
</script>
