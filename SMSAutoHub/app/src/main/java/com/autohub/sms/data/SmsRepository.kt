package com.autohub.sms.data

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import com.autohub.sms.network.ApiService
import com.autohub.sms.network.dto.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import timber.log.Timber
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SmsRepository @Inject constructor(
    private val smsDao: SmsDao,
    private val apiService: ApiService
) {
    
    // 로컬 데이터베이스 관련 메서드
    fun getAllSmsFlow(): Flow<List<SmsMessage>> {
        return smsDao.getAllSmsFlow()
    }
    
    suspend fun getRecentSms(limit: Int = 50): List<SmsMessage> {
        return smsDao.getRecentSms(limit)
    }
    
    suspend fun getSmsById(id: String): SmsMessage? {
        return smsDao.getSmsById(id)
    }
    
    suspend fun insertSms(smsMessage: SmsMessage) {
        try {
            smsDao.insertSms(smsMessage)
            Timber.d("SMS saved to database: ${smsMessage.id}")
        } catch (e: Exception) {
            Timber.e(e, "Error saving SMS to database")
            throw e
        }
    }
    
    suspend fun insertMultipleSms(smsMessages: List<SmsMessage>) {
        try {
            smsDao.insertMultipleSms(smsMessages)
            Timber.d("Multiple SMS saved to database: ${smsMessages.size} messages")
        } catch (e: Exception) {
            Timber.e(e, "Error saving multiple SMS to database")
            throw e
        }
    }
    
    suspend fun updateSms(smsMessage: SmsMessage) {
        smsDao.updateSms(smsMessage)
    }
    
    suspend fun markAsRead(id: String) {
        smsDao.markAsRead(id)
    }
    
    suspend fun markAllAsRead() {
        smsDao.markAllAsRead()
    }
    
    suspend fun updateAiAnalysis(
        id: String,
        isSpam: Boolean,
        category: MessageCategory,
        importance: ImportanceLevel,
        keywords: List<String>,
        summary: String,
        sentiment: Sentiment
    ) {
        smsDao.updateAiAnalysis(
            id, isSpam, category, importance, keywords, summary, sentiment, System.currentTimeMillis()
        )
    }
    
    suspend fun updateRelayStatus(id: String, status: RelayStatus, updatedAt: Long) {
        smsDao.updateRelayStatus(id, status, updatedAt)
    }
    
    suspend fun deleteSms(id: String) {
        smsDao.deleteSmsById(id)
    }
    
    suspend fun deleteOldSms(beforeTime: Long) {
        smsDao.deleteOldSms(beforeTime)
    }
    
    // 필터링 관련 메서드
    suspend fun getSmsBySender(sender: String): List<SmsMessage> {
        return smsDao.getSmsBySender(sender)
    }
    
    suspend fun getSmsByCategory(category: MessageCategory): List<SmsMessage> {
        return smsDao.getSmsByCategory(category)
    }
    
    suspend fun getSmsByImportance(importance: ImportanceLevel): List<SmsMessage> {
        return smsDao.getSmsByImportance(importance)
    }
    
    suspend fun getSmsBySpamStatus(isSpam: Boolean): List<SmsMessage> {
        return smsDao.getSmsBySpamStatus(isSpam)
    }
    
    suspend fun getSmsByRelayStatus(status: RelayStatus): List<SmsMessage> {
        return smsDao.getSmsByRelayStatus(status)
    }
    
    suspend fun getSmsByDateRange(startTime: Long, endTime: Long): List<SmsMessage> {
        return smsDao.getSmsByDateRange(startTime, endTime)
    }
    
    suspend fun searchSmsByContent(keyword: String): List<SmsMessage> {
        return smsDao.searchSmsByContent(keyword)
    }
    
    // 통계 관련 메서드
    suspend fun getTotalSmsCount(): Int {
        return smsDao.getTotalSmsCount()
    }
    
    suspend fun getSmsCountSince(since: Long): Int {
        return smsDao.getSmsCountSince(since)
    }
    
    suspend fun getSpamSmsCountSince(since: Long): Int {
        return smsDao.getSpamSmsCountSince(since)
    }
    
    suspend fun getSmsCountByCategorySince(category: MessageCategory, since: Long): Int {
        return smsDao.getSmsCountByCategorySince(category, since)
    }
    
    suspend fun getRelayStatusCountSince(status: RelayStatus, since: Long): Int {
        return smsDao.getRelayStatusCountSince(status, since)
    }
    
    suspend fun getAllSenders(): List<String> {
        return smsDao.getAllSenders()
    }
    
    suspend fun getSenderStatistics(): List<SenderStatistic> {
        return smsDao.getSenderStatistics()
    }
    
    // 원격 API 관련 메서드
    suspend fun syncSmsWithServer(): Result<Unit> {
        return try {
            val response = apiService.getSmsList()
            if (response.isSuccessful) {
                val apiResponse = response.body()
                if (apiResponse?.status == "success") {
                    apiResponse.data?.items?.let { smsList ->
                        val localSms = smsList.map { it.toSmsMessage() }
                        insertMultipleSms(localSms)
                    }
                }
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to sync SMS: ${response.code()}"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Error syncing SMS with server")
            Result.failure(e)
        }
    }
    
    suspend fun relaySmsToServer(smsMessage: SmsMessage): Result<Unit> {
        return try {
            val request = SmsRelayRequest(
                id = smsMessage.id,
                sender = smsMessage.sender,
                content = smsMessage.getMaskedContent(),
                timestamp = smsMessage.timestamp,
                isMasked = smsMessage.isMasked,
                category = smsMessage.category.name,
                importance = smsMessage.importance.name,
                keywords = smsMessage.keywords,
                summary = smsMessage.summary
            )
            
            val response = apiService.relaySms(request)
            if (response.isSuccessful) {
                updateRelayStatus(smsMessage.id, RelayStatus.SUCCESS, System.currentTimeMillis())
                Result.success(Unit)
            } else {
                updateRelayStatus(smsMessage.id, RelayStatus.FAILED, System.currentTimeMillis())
                Result.failure(Exception("Failed to relay SMS: ${response.code()}"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Error relaying SMS to server")
            updateRelayStatus(smsMessage.id, RelayStatus.FAILED, System.currentTimeMillis())
            Result.failure(e)
        }
    }
    
    suspend fun analyzeSmsWithAI(smsMessage: SmsMessage): Result<SmsAnalysisResponse> {
        return try {
            val request = SmsAnalysisRequest(
                content = smsMessage.content,
                sender = smsMessage.sender,
                analysisType = listOf("spam", "category", "importance", "sentiment", "summary")
            )
            
            val response = apiService.analyzeSms(request)
            if (response.isSuccessful) {
                val analysis = response.body()?.data
                if (analysis != null) {
                    updateAiAnalysis(
                        smsMessage.id,
                        analysis.isSpam,
                        MessageCategory.valueOf(analysis.category.uppercase()),
                        ImportanceLevel.valueOf(analysis.importance.uppercase()),
                        analysis.keywords,
                        analysis.summary,
                        Sentiment.valueOf(analysis.sentiment.uppercase())
                    )
                    Result.success(analysis)
                } else {
                    Result.failure(Exception("Empty analysis response"))
                }
            } else {
                Result.failure(Exception("Failed to analyze SMS: ${response.code()}"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Error analyzing SMS with AI")
            Result.failure(e)
        }
    }
    
    // 사용자 설정 관련 메서드
    suspend fun getUserSettings(): Result<UserSettingsResponse> {
        return try {
            val response = apiService.getUserSettings()
            if (response.isSuccessful) {
                response.body()?.data?.let { settings ->
                    Result.success(settings)
                } ?: Result.failure(Exception("Empty settings response"))
            } else {
                Result.failure(Exception("Failed to get user settings: ${response.code()}"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Error getting user settings")
            Result.failure(e)
        }
    }
    
    suspend fun updateUserSettings(preferences: UserPreferences): Result<UserSettingsResponse> {
        return try {
            val request = UserSettingsRequest(preferences)
            val response = apiService.updateUserSettings(request)
            if (response.isSuccessful) {
                response.body()?.data?.let { settings ->
                    Result.success(settings)
                } ?: Result.failure(Exception("Empty settings response"))
            } else {
                Result.failure(Exception("Failed to update user settings: ${response.code()}"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Error updating user settings")
            Result.failure(e)
        }
    }
    
    suspend fun getUsageStats(): Result<UsageStatsResponse> {
        return try {
            val response = apiService.getUsageStats()
            if (response.isSuccessful) {
                response.body()?.data?.let { stats ->
                    Result.success(stats)
                } ?: Result.failure(Exception("Empty usage stats response"))
            } else {
                Result.failure(Exception("Failed to get usage stats: ${response.code()}"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Error getting usage stats")
            Result.failure(e)
        }
    }
}

// DTO 변환 확장 함수
private fun SmsResponse.toSmsMessage(): SmsMessage {
    return SmsMessage(
        id = id,
        sender = sender,
        content = content,
        timestamp = timestamp,
        isRead = isRead,
        isSpam = isSpam,
        importance = ImportanceLevel.valueOf(importance.uppercase()),
        category = MessageCategory.valueOf(category.uppercase()),
        keywords = keywords,
        summary = summary,
        sentiment = Sentiment.valueOf(sentiment.uppercase()),
        isMasked = isMasked,
        relayStatus = RelayStatus.valueOf(relayStatus.uppercase()),
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}