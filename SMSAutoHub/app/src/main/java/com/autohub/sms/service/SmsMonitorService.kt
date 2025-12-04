package com.autohub.sms.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.autohub.sms.R
import com.autohub.sms.ui.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class SmsMonitorService : LifecycleService() {
    
    @Inject
    lateinit var smsRepository: com.autohub.sms.data.SmsRepository
    
    private val notificationManager by lazy {
        getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    }
    
    private val notificationId = 1001
    
    override fun onCreate() {
        super.onCreate()
        Timber.d("SMS Monitor Service created")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        
        when (intent?.action) {
            ACTION_START -> startMonitoring()
            ACTION_STOP -> stopMonitoring()
            else -> startMonitoring()
        }
        
        return START_STICKY
    }
    
    override fun onBind(intent: Intent): IBinder? {
        super.onBind(intent)
        return null
    }
    
    private fun startMonitoring() {
        createNotificationChannel()
        startForeground(notificationId, createNotification())
        
        // 모니터링 작업 시작
        lifecycleScope.launch {
            while (isActive) {
                try {
                    // 주기적으로 상태 확인 (필요시)
                    performHealthCheck()
                    delay(30000) // 30초마다 확인
                } catch (e: Exception) {
                    Timber.e(e, "Error in SMS monitoring")
                    delay(5000) // 에러 발생시 5초 후 재시도
                }
            }
        }
        
        Timber.d("SMS monitoring started")
    }
    
    private fun stopMonitoring() {
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        Timber.d("SMS monitoring stopped")
    }
    
    private fun performHealthCheck() {
        lifecycleScope.launch {
            try {
                // 데이터베이스 상태 확인
                val smsCount = smsRepository.getTotalSmsCount()
                Timber.d("Health check: Total SMS count = $smsCount")
                
                // 서버 연결 상태 확인 (필요시)
                // checkServerConnection()
                
            } catch (e: Exception) {
                Timber.e(e, "Health check failed")
            }
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "SMS Monitor",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "SMS 수신 및 중계 서비스 모니터링"
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }
            
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("AutoHub SMS")
            .setContentText("SMS 자동 중계 서비스 실행 중")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Timber.d("SMS Monitor Service destroyed")
    }
    
    companion object {
        const val NOTIFICATION_CHANNEL_ID = "sms_monitor_channel"
        const val ACTION_START = "com.autohub.sms.action.START_MONITORING"
        const val ACTION_STOP = "com.autohub.sms.action.STOP_MONITORING"
        
        fun startService(context: Context) {
            val intent = Intent(context, SmsMonitorService::class.java).apply {
                action = ACTION_START
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stopService(context: Context) {
            val intent = Intent(context, SmsMonitorService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }
}